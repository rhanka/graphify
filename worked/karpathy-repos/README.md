# Karpathy Repos Benchmark — How to Reproduce

This is the corpus that produced the 71.5x token reduction benchmark.

## Corpus (52 files)

### Code — clone these 3 repos

```bash
git clone https://github.com/karpathy/nanoGPT
git clone https://github.com/karpathy/minGPT
git clone https://github.com/karpathy/micrograd
```

### Papers — download these 5 PDFs

- Attention Is All You Need — https://arxiv.org/abs/1706.03762
- FlashAttention: Fast and Memory-Efficient Exact Attention — https://arxiv.org/abs/2205.14135
- FlashAttention-2 — https://arxiv.org/abs/2307.08691
- Neural Attention Residuals — https://arxiv.org/abs/2505.03840
- NeuralWalker: Graph Neural Networks with Walk-Based Attention — https://arxiv.org/abs/2502.02593

### Images — save these 4

- `gpt2_124M_loss.png` — nanoGPT training loss curve (in the nanoGPT repo)
- `gout.svg` — micrograd computation graph (in the micrograd repo)
- `moon_mlp.png` — MLP decision boundary (in the micrograd repo)
- Any screenshot or diagram from the Attention Is All You Need paper

## How to run

Put all files into a single folder called `raw/`:

```
raw/
├── nanoGPT/         (cloned repo)
├── minGPT/          (cloned repo)
├── micrograd/       (cloned repo)
├── attention.pdf
├── flashattention.pdf
├── flashattention2.pdf
├── attn_residuals.pdf
├── neuralwalker.pdf
├── gpt2_124M_loss.png
├── gout.svg
└── moon_mlp.png
```

Then in Claude Code:

```
pip install graphifyy && graphify install
/graphify ./raw
```

## What to expect

- ~285 nodes, ~340 edges, ~17 meaningful communities
- God nodes: `Value` (micrograd), `GPT` (nanoGPT), `Training Script`, `Layer`
- Surprising connections: nanoGPT Block and minGPT Block linked across repos, FlashAttention paper bridging into CausalSelfAttention in both repos
- Token reduction: 71.5x vs reading all 52 files cold

Full eval with scores and analysis: `review.md`
