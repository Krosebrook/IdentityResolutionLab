# 🧬 Identity Resolution Lab: Flash vs. Pro

An advanced benchmarking and processing workbench designed to evaluate the performance of **Gemini 3 Flash** against **Gemini 3 Pro** in complex Identity Resolution (IDR) tasks. The lab transforms messy, unstructured chat transcripts and legacy customer records into a unified "Golden Record."

## 🚀 Core Features

### ⚔️ The Battle of Inference
Run parallel processing streams to compare **Gemini 3 Flash** (Speed Optimized) and **Gemini 3 Pro** (Deep Reasoning).
- **Flash Engine**: Optimized for rapid merging with a low thinking budget (1k tokens).
- **Pro Engine**: Utilizes a high thinking budget (2k tokens) to stream Chain-of-Thought (CoT) reasoning, capturing nuanced intent that smaller models might miss.

### 🏆 Golden Record Synthesis
Features an **Arbiter Logic** that intelligently consolidates results from both models. If models disagree, a third synthesis pass evaluates the original context to establish the final definitive record.

### 📊 Precision Analytics
- **Confidence Gauges**: Visual circular indicators representing the trust score of synthesized data.
- **Efficiency Metrics**: Real-time tracking of latency (ms) and processing duration.
- **AI Chat Summaries**: Automatic generation of single-sentence transcript summaries using `flash-lite`.

### 🛠 Workbench Tools
- **Manual Injection**: Test specific edge cases by inputting raw customer data and transcripts manually.
- **Bulk Stream**: Inject sequential scenarios (Suit-themed personas) to test system resilience.
- **Data Portability**: Export resolved identities and synthesis logs in **JSON** or **CSV** formats.

## 🛠 Technology Stack

- **Framework**: React 19 (Strict Mode)
- **AI Intelligence**: Google Gemini API (@google/genai)
- **Styling**: Tailwind CSS (Material Dark Palette)
- **Icons**: Lucide React
- **State Management**: React Hooks with LocalStorage Persistence

## 🚦 Getting Started

1. Ensure your environment has the `API_KEY` configured.
2. Click **Inject Data** to populate the stream.
3. Use the **Segmented Control** to select your model configuration (Flash, Pro, or Both).
4. Click **Start Battle** to initiate the resolution engine.
5. Expand history items to view **Reasoning Insights** and **Synthesis Logs**.

---
*Developed by Senior Frontend Engineering for the Gemini Ecosystem.*
