import { ocrService } from "../../modules/qna/quora/quora.extra.ocr.service.js";
import prisma from "../../utlis/prisma.js";
import { addEmbedJob } from "../queues/embeddingQueue.js";
import { createWorker } from "./worker.js";
import fetch from "node-fetch";

const ocrWorker = createWorker("ocr-processing", async (job) => {
  const { quoraId } = job?.data;
  try {
    const getQuora = await prisma.quora.findUnique({
      where: {
        id: quoraId,
      },
    });

    const getQuoraImages = await prisma.quoraImage.findMany({
      where: {
        quoraId: quoraId,
      },
    });

    const quoraImageUrls = getQuoraImages?.map((el) => el?.imageUrl);

    let ocrFullContent = "";

    if (quoraImageUrls?.length > 0) {
      for (const imageUrl of quoraImageUrls) {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error("Failed to fetch image");
          const imageBuffer = await response.buffer();
          const ocrResult = await ocrService.extractTextFromImage(imageBuffer);
          if (ocrResult && ocrResult?.confidence < 90) {
            const ocrResultGoogle =
              await ocrService.extractTextFromImageGoogle(imageBuffer);
            if (ocrResultGoogle?.text)
              ocrFullContent += ocrResultGoogle?.text + " ";
            else ocrFullContent += " " + ocrResult?.text;
          } else {
            ocrFullContent += " " + ocrResult?.text;
          }
        } catch (error) {}
      }
    }

    const updateData = {
      OCRcontent: ocrFullContent,
      ocrProcessed: true,
    };

    const updateQuora = await prisma.quora.update({
      where: {
        id: quoraId,
      },
      data: updateData,
    });

    await addEmbedJob(quoraId, getQuora?.content, ocrFullContent);
  } catch (error) {
    console.error(`[ocr-processing] failed for ${job.id}`, error);
    throw error;
  }
});
