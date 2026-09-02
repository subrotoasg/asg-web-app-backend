import { createWorker } from "./worker.js";
import prisma from "../../utlis/prisma.js";
import { GoogleGenAI } from "@google/genai";
import config from "../../config/index.js";
import { selectFields } from "../../modules/qna/quora/quora.constants.js";
import { constants } from "../../constant/index.js";

const ai = new GoogleGenAI({ apiKey: config.gemini_api_key });
const MODEL = "gemini-2.5-flash";

const answerGenerateWorker = createWorker(
  "generate-answer-comment-processing",
  async (job) => {
    const { answerId } = job?.data;

    try {
      const getAnswer = await prisma.answer.findUnique({
        where: {
          id: answerId,
        },
      });

      const getQuora = await prisma.quora.findFirst({
        where: {
          id: getAnswer?.quoraId,
        },
        select: selectFields,
      });

      let history = [];

      const prompt = constants.qnaPrompt;

      //initial user q
      history.push({
        role: "user",
        parts: [
          {
            text: prompt,
          },
          {
            text: buildProblemText(getQuora?.content, getQuora?.OCRcontent),
          },
        ],
      });

      history.push({
        role: "model",
        parts: [{ text: getAnswer?.content }],
      });

      const getAnswerCommentHistory = await prisma.answerComment.findMany({
        where: {
          answerId: answerId,
          solverId: null,
        },
      });

      getAnswerCommentHistory.map((msg) => {
        if (msg?.studentId)
          history.push({
            role: "user",
            parts: [{ text: msg?.comments }],
          });
        else
          history.push({
            role: "model",
            parts: [{ text: msg?.comments }],
          });
      });

      const result = await ai.models.generateContent({
        model: MODEL,
        contents: history,
      });

      const answerCommentMarkdown =
        result?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text)
          .join("\n")
          .trim() || null;

      // console.log(answerCommentMarkdown, "answer markdown");

      const doComment = await prisma.answerComment.create({
        data: {
          answerId: answerId,
          comments: answerCommentMarkdown,
        },
      });
    } catch (error) {
      console.log(error, "eroro");
      //TODO:: no need to retry if error happens. waste of token. suggestions?
    }
  },
);

function buildProblemText(content = "", ocrText = "") {
  let contentText = "";
  if (content?.trim()) contentText += content.trim() + "\n";
  if (ocrText?.trim()) contentText += "\n[OCR]\n" + ocrText.trim();
  const LIMIT = 12000;
  return contentText.length > LIMIT ? t.slice(0, LIMIT) : contentText;
}
