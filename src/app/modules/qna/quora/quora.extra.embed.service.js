import { GoogleGenAI } from "@google/genai";
import { pipeline } from "@xenova/transformers";

class LocalEmbeddingService {
  static instance = null;
  static modelName = "Xenova/multi-qa-mpnet-base-dot-v1";
  static dimensions = 768;

  static async getInstance() {
    if (!this.instance) {
      try {
        this.instance = await pipeline("feature-extraction", this.modelName, {
          quantized: false,
          progress_callback: (data) => {
            if (data.status === "ready") {
              console.log("onnx embedding model ready");
            }
          },
        });
      } catch (error) {
        console.error("failed to load local model:", error);
        throw error;
      }
    }
    return this.instance;
  }

  static async generateEmbeddings(text) {
    try {
      const extractor = await this.getInstance();

      const result = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });

      const embedding = Array.from(result.data);

      if (embedding.length !== this.dimensions) {
        throw new Error(
          `Expected ${this.dimensions} dimensions, got ${embedding.length}`,
        );
      }

      return {
        embeddings: [
          {
            values: embedding,
          },
        ],
        model: this.modelName,
        dimensions: this.dimensions,
        source: "local",
      };
    } catch (error) {
      console.error("Local embedding failed:", error);
      throw error;
    }
  }
}

export async function generateEmbeddings(content = "") {
  const ai = new GoogleGenAI({});

  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: content,
      config: {
        outputDimensionality: 768,
      },
    });

    return response;
  } catch (lcerror) {
    try {
      const localResult =
        await LocalEmbeddingService.generateEmbeddings(content);
      return localResult;
    } catch (geerror) {
      console.log("Both local and Gemini embeddings failed:", {
        localError: lcerror.message,
        geminiError: geerror.message,
      });
      throw new Error(`All embedding methods failed`);
    }
  }
}

export async function preWarmEmbeddingModel() {
  try {
    await LocalEmbeddingService.getInstance();
    return true;
  } catch (error) {
    console.error("❌ Failed to pre-warm local model:", error);
    return false;
  }
}
