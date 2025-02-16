let model;

// *Disease Labels (Match Model Output Exactly)*
const diseases = [
    "Yellow_Curly_leaf", "Bacterial_Spot", "Healthy_leaf",
    "Leaf_Mold", "Mosaic_virus", "Early_blight", "Late_blight"
];

// *Disease Solutions (Ensured Every Disease Has a Solution)*
const diseaseSolutions = {
    "Yellow Curly Leaf": "🟡 Use neem oil or insecticidal soap to control whiteflies that spread the virus.",
    "Bacterial Spot": "🦠 Apply copper-based fungicides and avoid overhead watering to prevent bacterial spread.",
    "Healthy Leaf": "✅ No disease detected! Keep providing proper water and nutrients to maintain plant health.",
    "Leaf Mold": "🍃 Improve air circulation, avoid wetting leaves, and apply sulfur-based fungicides.",
    "Mosaic Virus": "🛑 Remove infected plants immediately and control aphids to prevent virus spread.",
    "Early Blight": "☀ Remove infected leaves, apply fungicides like chlorothalonil, and avoid overhead watering.",
    "Late Blight": "🌧 Use copper-based fungicides and remove infected plants to prevent disease spread."
};

// *Load Model*
async function loadModel() {
    try {
        document.getElementById("loading").style.display = "block";
        model = await tf.loadLayersModel('https://teachablemachine.withgoogle.com/models/ylhUyVla-/model.json');
        document.getElementById("loading").style.display = "none";
        console.log("✅ Model Loaded Successfully!");
    } catch (error) {
        document.getElementById("loading").style.display = "none";
        console.error("❌ Error loading model:", error);
        alert("Failed to load the model. Please check the model URL.");
    }
}

loadModel();

// *Detect Disease*
async function detectDisease() {
    if (!model) {
        document.getElementById("result").innerHTML = "❗ Model not loaded yet. Please wait.";
        return;
    }

    const upload = document.getElementById("upload").files[0];
    const result = document.getElementById("result");
    const preview = document.getElementById("preview");

    if (!upload) {
        result.innerHTML = "❗ Please upload an image!";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        preview.src = event.target.result;
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = event.target.result;

        image.onload = async function() {
            try {
                let tensor = tf.browser.fromPixels(image)
                    .resizeBilinear([224, 224]) // Resize to model's expected input size
                    .toFloat()
                    .div(tf.scalar(255)) // Normalize pixel values
                    .expandDims();

                const predictions = await model.predict(tensor).data();
                console.log("📊 Predictions:", predictions);

                // *Get the Highest Confidence Prediction*
                const maxProb = Math.max(...predictions);
                const detectedIndex = predictions.indexOf(maxProb);

                if (detectedIndex === -1 || maxProb < 0.7) { // Increase confidence threshold
                    result.innerHTML = "❗ Unable to detect a disease. Please upload a clear plant leaf image.";
                    return;
                }

                let detectedDisease = diseases[detectedIndex].replace(/_/g, " "); // Format disease name properly

                // *Check if it's a healthy leaf*
                if (detectedDisease === "Healthy leaf") {
                    result.innerHTML = "✅ No disease detected! Keep providing proper water and nutrients to maintain plant health. 🌿";
                    speak("No disease detected! Keep providing proper water and nutrients to maintain plant health.");
                    saveHistory(detectedDisease, "No disease detected.");
                    return;
                }

                // *Ensure Every Disease Has a Solution*
                let solutionKey = Object.keys(diseaseSolutions).find(key => key.toLowerCase() === detectedDisease.toLowerCase());
                let solution = solutionKey ? diseaseSolutions[solutionKey] : "⚠ No solution found. Please consult an expert.";

                // *Display Result*
                result.innerHTML = `<strong>🔍 Detected Disease:</strong> ${detectedDisease} <br> 
                                    (Confidence: ${(maxProb * 100).toFixed(2)}%) <br><br> 
                                    <strong>💡 Solution:</strong> ${solution}`;

                // *Speak Disease Name & Solution* ✅ **Using Selected Voice**
                speak(`Detected Disease: ${detectedDisease}. Solution: ${solution}`);

                // *Save Detection History*
                saveHistory(detectedDisease, solution);

            } catch (error) {
                console.error("❌ Error during prediction:", error);
                result.innerHTML = "❗ Error predicting the disease.";
            }
        };
    };
    reader.readAsDataURL(upload);
}

// *🗣 Text-to-Speech (Using Selected Female Voice)*
function speak(text) {
    let speechToggle = document.getElementById("voiceToggle").checked; // ✅ Check if voice is enabled
    if (!speechToggle) return; // ❌ Exit if voice is OFF

    let speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US"; // **English Female Voice**
    speech.rate = 0.9;
    speech.pitch = 1.2;

    let selectedVoiceName = document.getElementById("voiceSelect").value;
    let voices = window.speechSynthesis.getVoices();

    // Find the selected voice by its name
    let selectedVoice = voices.find(voice => voice.name === selectedVoiceName);
    speech.voice = selectedVoice || voices[0]; // Default to first available if not found

    console.log("🎙️ Using voice:", speech.voice.name);

    window.speechSynthesis.speak(speech);
}

// **Populate Voice Dropdown**
function populateVoiceList() {
    let voiceSelect = document.getElementById("voiceSelect");
    let voices = window.speechSynthesis.getVoices();

    voiceSelect.innerHTML = ""; // Clear previous options
    voices.forEach(voice => {
        let option = document.createElement("option");
        option.value = voice.name;
        option.text = voice.name;
        voiceSelect.appendChild(option);
    });
}

// **Ensure voices are loaded properly**
window.speechSynthesis.onvoiceschanged = function() {
    console.log("✅ Voices updated.");
    populateVoiceList();
};

// ✅ Save Voice Toggle Setting
document.getElementById("voiceToggle").addEventListener("change", function() {
    localStorage.setItem("voiceEnabled", this.checked ? "true" : "false");
});

// *🌗 Toggle Light & Dark Mode*
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    document.querySelector(".container").classList.toggle("dark-mode");

    let mode = document.body.classList.contains("dark-mode") ? "dark" : "light";
    localStorage.setItem("theme", mode);
}

// *Save & Show History*
function saveHistory(disease, solution) {
    let history = JSON.parse(localStorage.getItem("diseaseHistory")) || [];
    history.push({
        disease,
        solution,
        time: new Date().toLocaleString()
    });
    localStorage.setItem("diseaseHistory", JSON.stringify(history));
    showHistory();
}

// *Load & Display Previous Detections*
function showHistory() {
    let history = JSON.parse(localStorage.getItem("diseaseHistory")) || [];
    let historyDiv = document.getElementById("history");

    historyDiv.innerHTML = history.length === 0 ? "📜 No previous detections." : "<h3>📜 Detection History</h3>";

    history.forEach(entry => {
        historyDiv.innerHTML += `<p><strong>📅 ${entry.time}</strong><br> 
                                  🔍 ${entry.disease}<br> 
                                  💡 ${entry.solution}</p><hr>`;
    });
}

// *🗑 Clear Detection History*
function clearHistory() {
    localStorage.removeItem("diseaseHistory");
    document.getElementById("history").innerHTML = "📜 History cleared!";
}

// *Apply Saved Theme & Show History on Load*
window.onload = function() {
    let savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        document.querySelector(".container").classList.add("dark-mode");
    }
    showHistory();

    // ✅ Apply Saved Voice Toggle Setting
    let savedVoiceState = localStorage.getItem("voiceEnabled");
    if (savedVoiceState === "false") {
        document.getElementById("voiceToggle").checked = false; // Keep voice off if previously disabled
    }

    // Populate available voices
    populateVoiceList();
};