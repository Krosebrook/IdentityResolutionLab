# 🏛 Technical Architecture

The Identity Resolution Lab operates on a **Hybrid Synthesis Architecture**. This document outlines the technical flow and decision-making patterns used to achieve high-accuracy data resolution.

## 1. Data Processing Pipeline

The system follows a linear pipeline with parallel execution branches:

1.  **Input Generation**: Scenarios are pulled from a sequence or manual modal.
2.  **Parallel Inference**:
    - **Flash Branch**: High-speed, low-cost JSON generation.
    - **Pro Branch**: High-latency, deep-thinking streaming session.
3.  **State Synchronization**: The `history` state in `App.tsx` acts as the single source of truth, updating progressively as streams finish.
4.  **Arbiter Consolidation**: Once both model branches reach `completed` status, the **Arbiter Service** is triggered to resolve conflicts.

## 2. The Arbiter Pattern

The "Arbiter" is a specific implementation of a synthesis pass. Instead of a simple "majority vote," the Arbiter is prompted with:
- The original record.
- The raw transcript.
- The rationale from the Pro model.
- The efficiency output from the Flash model.

The Arbiter's job is to identify "hallucinations" in the fast model and "over-complications" in the reasoning model, producing a balanced **Golden Record**.

## 3. UI/UX Design System

- **Segmented Model Control**: Uses a sliding indicator with cubic-bezier transitions for high-fidelity interaction.
- **Log Terminals**: Emulates a developer console for real-time CoT (Chain of Thought) visibility.
- **Persistence Layer**: State is mirrored to `localStorage` under `resolution_lab_state_v1` to prevent data loss during laboratory sessions.

## 4. Error Resilience

Error handling is implemented at the service level:
- **Parse Errors**: Handled by regex cleaning (removing markdown code blocks) before JSON parsing.
- **Network Errors**: Captured and displayed with specific diagnostic messages.
- **Retry Logic**: Failed items can be re-run individually without re-processing the entire queue.
