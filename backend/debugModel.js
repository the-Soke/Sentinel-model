import ort from "onnxruntime-node";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugModel() {
  try {
    const modelPath = path.join(__dirname, "./src/model/sentinel_model_fixed.onnx");
    console.log("🔍 Loading model from:", modelPath);
    
    const session = await ort.InferenceSession.create(modelPath);
    
    console.log("\n✅ Model loaded successfully!\n");
    
    // Get input metadata
    console.log("=" .repeat(50));
    console.log("INPUT DETAILS:");
    console.log("=" .repeat(50));
    
    session.inputNames.forEach((name, idx) => {
      const input = session.inputNames[idx];
      console.log(`Input ${idx}:`);
      console.log(`  Name: "${input}"`);
    });
    
    // Get output metadata
    console.log("\n" + "=".repeat(50));
    console.log("OUTPUT DETAILS:");
    console.log("=" .repeat(50));
    
    session.outputNames.forEach((name, idx) => {
      const output = session.outputNames[idx];
      console.log(`Output ${idx}:`);
      console.log(`  Name: "${output}"`);
    });
    
    console.log("\n" + "=".repeat(50));
    console.log("TESTING WITH SAMPLE DATA:");
    console.log("=" .repeat(50));
    
    // Try different input names
    const testInputNames = [
      "input",
      "input_1", 
      "float_input",
      "X",
      session.inputNames[0] // Use the actual first input name
    ];
    
    for (const inputName of testInputNames) {
      try {
        console.log(`\n🧪 Testing with input name: "${inputName}"`);
        
        const inputTensor = new ort.Tensor(
          "float32",
          Float32Array.from([0, 0, 0, 0, 0, 0, 1, 1, 1, 12]), // 10 features
          [1, 10]
        );
        
        const feeds = { [inputName]: inputTensor };
        const output = await session.run(feeds);
        
        console.log("✅ SUCCESS! Use this input name:", inputName);
        console.log("Output keys:", Object.keys(output));
        console.log("Output data:", output[Object.keys(output)[0]].data);
        
        return { inputName, outputName: Object.keys(output)[0] };
        
      } catch (err) {
        console.log("❌ Failed:", err.message);
      }
    }
    
    console.log("\n⚠️ None of the common input names worked.");
    console.log("Please check your model export script.");
    
  } catch (error) {
    console.error("❌ Error loading model:", error);
  }
}

debugModel();