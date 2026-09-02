import { createWorker } from "tesseract.js";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import config from "../../../config/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class OCRService {
  constructor() {
    // Tesseract
    this.worker = null;
    this.isInitialized = false;

    // Google GenAI
    this.genAI = null;
    this.isGoogleInitialized = false;
    this.googleModel = "gemini-2.5-flash";
  }

  _extractTextFromGenAI(result) {
    if (result?.output_text && typeof result.output_text === "string") {
      return result.output_text;
    }

    const topCandidates = result?.candidates;
    if (Array.isArray(topCandidates) && topCandidates.length) {
      const parts = topCandidates[0]?.content?.parts || [];
      const text = parts
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .filter(Boolean)
        .join("\n");
      if (text) return text;
    }

    const respCandidates = result?.response?.candidates;
    if (Array.isArray(respCandidates) && respCandidates.length) {
      const parts = respCandidates[0]?.content?.parts || [];
      const text = parts
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .filter(Boolean)
        .join("\n");
      if (text) return text;
    }

    return "";
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      const tessdataPath = path.join(__dirname, "../../../../../tessdata");

      this.worker = await createWorker("ben+eng+equ", 1, {
        langPath: tessdataPath,
        cachePath: tessdataPath,
        logger: (m) => {
          if (m.status === "loading language traineddata") {
            console.log(`loading language: ${m.userJobId}`);
          }
        },
      });

      await this.worker.setParameters({
        tessedit_pageseg_mode: "6",
        tessedit_ocr_engine_mode: "1",
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });

      this.isInitialized = true;
    } catch (error) {
      console.error("failed to initialize tesseract worker:", error);
      throw error;
    }
  }

  async preprocessImage(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      let pipeline = sharp(imageBuffer);

      if (metadata.width < 1000 || metadata.height < 1000) {
        pipeline = pipeline
          .resize(2000, null, { withoutEnlargement: false })
          .grayscale()
          .linear(1.5, 0)
          .sharpen({ sigma: 1.5 })
          .normalise()
          .threshold(160);
      } else {
        pipeline = pipeline
          .grayscale()
          .linear(1.3, 0)
          .sharpen({ sigma: 1.0 })
          .normalise()
          .threshold(128);
      }

      return pipeline.png().toBuffer();
    } catch (error) {
      console.error("image preprocessing failed:", error);
      throw error;
    }
  }

  async extractTextFromImage(imageBuffer) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const processed = await this.preprocessImage(imageBuffer);
      const { data } = await this.worker.recognize(processed);

      return {
        engine: "tesseract",
        text: this.cleanText(data.text),
        confidence: data.confidence,
        rawText: data.text,
      };
    } catch (error) {
      console.error("OCR processing failed:", error);
      throw error;
    }
  }

  cleanText(text) {
    return (text || "")
      .replace(/\n\s*\n/g, "\n\n")
      .replace(/[^\S\n]+/g, " ")
      .trim();
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.isInitialized = false;
      console.log("tesseract worker terminated");
    }
  }

  /* ---------------- Google GenAI: fixed ---------------- */

  async initializeGoogle() {
    if (this.isGoogleInitialized) return;

    const apiKey =
      config?.gemini_api_key ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Missing Gemini API key. Set config.gemini_api_key or GOOGLE_API_KEY / GEMINI_API_KEY."
      );
    }

    this.genAI = new GoogleGenAI({ apiKey });
    this.isGoogleInitialized = true;
  }

  async extractTextFromImageGoogle(imageBuffer) {
    try {
      await this.initializeGoogle();

      const processed = await this.preprocessImage(imageBuffer);
      const base64 = Buffer.from(processed).toString("base64");

      // Note: parts go directly in `contents`, use inlineData (camelCase)
      const result = await this.genAI.models.generateContent({
        model: this.googleModel || "gemini-2.5-flash",
        contents: [
          { inlineData: { mimeType: "image/png", data: base64 } },
          {
            text: "just do proper ocr, keep all the symbols as is. and just return the ocr text only.",
          },
        ],
      });

      const text = this.cleanText(this._extractTextFromGenAI(result));

      if (!text) {
        console.warn("[Google OCR] Empty text. Inspecting candidate parts:");
        console.warn(
          JSON.stringify(
            result?.candidates?.[0]?.content?.parts ??
              result?.response?.candidates?.[0]?.content?.parts ??
              [],
            null,
            2
          )
        );
      }

      return {
        engine: "google-genai",
        text,
        confidence: null,
        rawText: text,
      };
    } catch (error) {
      console.error("Google OCR failed:", error);
      return {
        engine: "google-genai",
        text: null,
        confidence: null,
        rawText: null,
      };
    }
  }
}

export const ocrService = new OCRService();
