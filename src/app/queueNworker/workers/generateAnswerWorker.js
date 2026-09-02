import { createWorker } from "./worker.js";
import fetch from "node-fetch";
import sharp from "sharp";
import prisma from "../../utlis/prisma.js";
import { GoogleGenAI } from "@google/genai";
import config from "../../config/index.js";
import { selectFields } from "../../modules/qna/quora/quora.constants.js";

const ai = new GoogleGenAI({ apiKey: config.gemini_api_key });
const MODEL = "gemini-2.5-flash";

const answerGenerateWorker = createWorker(
  "generate-answer-processing",
  async (job) => {
    const { quoraId } = job?.data;

    try {
      const getQuora = await prisma.quora.findFirst({
        where: {
          id: quoraId,
        },
        select: selectFields,
      });

      const problemText = buildProblemText(
        getQuora?.content,
        getQuora?.OCRcontent
      );

      const imageUrls = getQuora?.quoraImage?.map((el) => el?.imageUrl);

      const images = await makeBase64imageArray(imageUrls);

      const prompt =
        "You are an HSC (Bangladesh curriculum) problem solver. " +
        "Your ONLY task is to generate the **complete, detailed solution in Bangla Markdown format** for the following problem. " +
        "Use **LaTeX** for all math expressions and equations. " +
        "DO NOT include any text before or after the solution. **Start directly with the solution in Markdown.**";

      const user =
        "Solve the problem and don't take any previous context its a seperate and first question. Provide the full, renderable answer now.";

      const contents = [
        { text: prompt },
        ...images,
        { text: `Problem:\n${problemText}` },
        { text: user },
      ];

      const result = await ai.models.generateContent({
        model: MODEL,
        contents,
      });

      const answerMarkdown = result?.text?.trim() || null;

      // if (answerMarkdown) {
      //   console.log("--- extracted answer markdonw ---");
      //   console.log(answerMarkdown);
      //   console.log("--------------------------------------------");
      // } else {
      //   console.warn("Could not extract any Markdown answer text.");
      // }

      const aiAnswerData = {
        quoraId: quoraId,
        content: answerMarkdown,
        isAi: true,
      };

      const createAiSolution = await prisma.answer.create({
        data: aiAnswerData,
      });

      // const getSimillarQuoras =
      //   await QuoraServices.getSimilarSolvedQuoras(quoraId);

      // const similarQuoras = getSimillarQuoras.map((el) => el?.quoraId);

      // const similarAnswerData = {
      //   quoraId: quoraId,
      //   similarQuoras: similarQuoras,
      // };

      // const writeSimilarAnswer = await prisma.answer.create({
      //   data: similarAnswerData,
      // });
    } catch (error) {
      console.log(error, "eroro");
      //TODO:: no need to retry if error happens. waste of token. suggestions?
    }
  }
);

function buildProblemText(content = "", ocrText = "") {
  let contentText = "";
  if (content?.trim()) contentText += content.trim() + "\n";
  if (ocrText?.trim()) contentText += "\n[OCR]\n" + ocrText.trim();
  const LIMIT = 12000;
  return contentText.length > LIMIT ? t.slice(0, LIMIT) : contentText;
}

async function makeBase64imageArray(urls) {
  const b64images = [];
  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) continue;
    const buf = Buffer.from(await response.arrayBuffer());
    const png = await sharp(buf).png().toBuffer();
    b64images.push({
      inlineData: { mimeType: "image/png", data: png.toString("base64") },
    });
  }
  return b64images;
}
