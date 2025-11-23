
# Apex: Graph-Based Semantic Clustering for Predator Detection & REST API Implimentation

## General Summary

This system uses a **Graph-Based Semantic Clustering** approach to identify predatory behaviour in online conversations. Unlike traditional keyword filters or metadata classifiers, this approach captures the **full context** of the conversation.

The model builds a directed graph of the conversation that captures the flow of influence. Using the semantic data and direction of the messages, the conversation's "signature" is compared against known predator archetypes using **K-Means clustering**.

## System Pipeline

The detection process follows a four-stage pipeline, transforming raw text into a probabilistic risk assessment.

### 1. Semantic Embedding (Vectorization)

- **Input**: Raw XML conversation logs.
- **Process**: Every message in the conversation is passed through the **Cohere Embed v4 API**. This converts text into a 1536-dimensional vector representation.

This process captures meaning, context, and intent, allowing the system to understand the underlying relationships between words without them being explained. The resulting vectors also support numerical comparisons and operations.

### 2. Contextual Graph Construction

This stage determines the structure of the conversation. A graph \( G = (V, E) \) is built, where:

- **Node (V)**: Individual message vectors.
- **Edge (E)**: Contextual links between messages.

The edge weight between message \( A \) and \( B \) is calculated using multiplicative time decay:

$$ W_{a,b} = Sim(A, B) \cdot t + reply $$

Where:

- **Sim(A, B)**: Cosine similarity between message embeddings.
- **t**: Exponential time decay, which weakens connections as time passes.
- **reply**: Structural bonus if message \( B \) is a direct reply to message \( A \).

### 3. Archetypal Clustering

This stage compares the current conversation against known predatory patterns. Instead of using a rule-based classifier, the model employs Unsupervised Clustering (K-Means).

- **Training**: The model learns k centroids for "Predator Conversations" and k centroids for "Normal Conversations", which represent archetypes for various types of conversations.
- **Inference**: The system calculates the cosine distance between the new conversation's vector and the nearest Predator Archetype vs. the nearest Normal Archetype.

### 4. Heuristic Risk Adjustment

This stage serves as a safety net for explicit threats. While the clustering captures semantic patterns, a heuristic penalty is applied for high-risk vocabulary.

The final output is a probability score based on the ratio of distances:

$$ P(Predator) = 1 - \frac{D'_{pred}}{D'_{pred} + D_{norm}} $$

This yields:

- A percentage confidence indicating the likelihood of predatory behaviour.
- A binary label of predator/safe.
- Interpretability with distance metrics and keywords found.
