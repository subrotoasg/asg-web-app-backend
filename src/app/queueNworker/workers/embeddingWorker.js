import config from "../../config/index.js";
import { Enums } from "../../constant/enums.js";
import {
  generateEmbeddings,
  preWarmEmbeddingModel,
} from "../../modules/qna/quora/quora.extra.embed.service.js";
import { QuoraServices } from "../../modules/qna/quora/quora.services.js";
import prisma from "../../utlis/prisma.js";
import { addGenerateAnswerJob } from "../queues/generateAnswerQueue.js";
import { createWorker } from "./worker.js";

const MODEL_NAME = "gemini-embedding-001";

let embeddingModelReady = false;

const initializeEmbeddingModel = async () => {
  if (!embeddingModelReady) {
    try {
      await preWarmEmbeddingModel();
      embeddingModelReady = true;
    } catch (error) {
      console.error("failed to pre-warm embedding model:", error);
    }
  }
};

const embedWorker = createWorker("embed-processing", async (job) => {
  const { quoraId, content, ocrContent } = job?.data;

  try {
    if (!embeddingModelReady) {
      await initializeEmbeddingModel();
    }
    const text = prepareTextForEmbedding(content, ocrContent);

    const embedResult = await generateEmbeddings(text);

    const theEmbedding = embedResult?.embeddings[0].values;

    const pgVectorLiteral = toVectorLiteral(theEmbedding);

    const [newEmbedding] = await prisma.$queryRaw`
            INSERT INTO "questionEmbeddings"
            ("id", "quoraId", "embedding", "modelName", "createdAt", "updatedAt")
            VALUES (
            gen_random_uuid(),
            ${quoraId}::uuid,
            ${pgVectorLiteral}::vector,
            ${MODEL_NAME},
            now(),
            now()
              )
              RETURNING id;
          `;

    const updateEmbeddingRefs = await prisma.quora.update({
      where: {
        id: quoraId,
      },
      data: {
        embeddingRef: newEmbedding?.id,
      },
    });

    const getSimillarQuoras =
      await QuoraServices.getSimilarSolvedQuoras(quoraId);

    let decideDuplicate = false;

    for (const q of getSimillarQuoras) {
      if (q?.similarity >= config.similarity_threshold) {
        decideDuplicate = true;
      }
    }

    const similarQuoras = getSimillarQuoras.map((el) => el?.quoraId);

    const similarAnswerData = {
      quoraId: quoraId,
      similarQuoras: similarQuoras,
    };

    const writeSimilarAnswer = await prisma.answer.create({
      data: similarAnswerData,
    });

    if (decideDuplicate) {
      const markAsDuplicate = await prisma.quora.update({
        where: {
          id: quoraId,
        },
        data: {
          status: Enums.quoraStatus.DUPLICATE,
        },
      });
    } else {
      const goNext = await prisma.quora.update({
        where: {
          id: quoraId,
        },
        data: {
          status: Enums.quoraStatus.UNSOLVED,
        },
      });
      await addGenerateAnswerJob(quoraId);
    }
  } catch (error) {
    console.log(error, "error in embedding");
    throw error;
  }
});

function prepareTextForEmbedding(content, ocrContent) {
  let text = "";

  if (content && content.trim()) {
    text += content.trim() + " ";
  }

  if (ocrContent && ocrContent.trim()) {
    const cleanOCR = ocrContent.replace(/--- Image \d+ ---/g, "").trim();
    if (cleanOCR) {
      text += cleanOCR + " ";
    }
  }

  const maxLength = 8000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
  }

  return text.trim();
}

function toVectorLiteral(arr) {
  if (!Array.isArray(arr) || !arr.length) {
    throw new Error("Embedding array is empty or invalid.");
  }
  const cleaned = arr.map((x, i) => {
    const v = Number(x);
    if (!Number.isFinite(v)) {
      throw new Error(`Embedding value at index ${i} is not finite: ${x}`);
    }
    return v;
  });
  return `[${cleaned.join(",")}]`;
}
