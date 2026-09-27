import { shuffle } from './utils.js';

const MSE = (labels, preds) => {
  let sum = 0;
  for (let i = 0; i < labels.length; i++) {
    const diff = labels[i] - preds[i];
    sum += diff * diff;
  }
  return sum / labels.length;
};

const MAE = (labels, preds) => {
  let sum = 0;
  for (let i = 0; i < labels.length; i++) {
    sum += Math.abs(labels[i] - preds[i]);
  }
  return sum / labels.length;
};

const RMSE = (labels, preds) => Math.sqrt(MSE(labels, preds));

function regressionTree(features, labels, options = {}) {
  const maxDepth = options.maxDepth || 10;
  const minSamples = options.minSamples || 2;
  const featureCount = features[0].length;

  function build(indices, depth) {
    const nodeLabels = indices.map(i => labels[i]);
    const mean = nodeLabels.reduce((s, v) => s + v, 0) / nodeLabels.length;

    if (depth >= maxDepth || indices.length <= minSamples) {
      return { leaf: true, value: mean };
    }

    let bestFeature = -1;
    let bestThreshold = 0;
    let bestScore = Infinity;
    const featureIndices = options.maxFeatures
      ? shuffle([...Array(featureCount).keys()]).slice(0, Math.max(1, Math.ceil(featureCount * options.maxFeatures)))
      : [...Array(featureCount).keys()];

    for (const f of featureIndices) {
      const values = indices.map(i => features[i][f]).sort((a, b) => a - b);
      const thresholds = new Set();
      for (let i = 0; i < values.length - 1; i++) {
        if (values[i] !== values[i + 1]) {
          thresholds.add((values[i] + values[i + 1]) / 2);
        }
      }
      for (const t of thresholds) {
        const left = [];
        const right = [];
        for (const i of indices) {
          if (features[i][f] <= t) left.push(i);
          else right.push(i);
        }
        if (left.length === 0 || right.length === 0) continue;

        const leftMean = left.reduce((s, i) => s + labels[i], 0) / left.length;
        const rightMean = right.reduce((s, i) => s + labels[i], 0) / right.length;

        const score =
          left.reduce((s, i) => s + (labels[i] - leftMean) ** 2, 0) +
          right.reduce((s, i) => s + (labels[i] - rightMean) ** 2, 0);

        if (score < bestScore) {
          bestScore = score;
          bestFeature = f;
          bestThreshold = t;
        }
      }
    }

    if (bestFeature === -1) {
      return { leaf: true, value: mean };
    }

    const leftIndices = [];
    const rightIndices = [];
    for (const i of indices) {
      if (features[i][bestFeature] <= bestThreshold) leftIndices.push(i);
      else rightIndices.push(i);
    }

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return { leaf: true, value: mean };
    }

    return {
      leaf: false,
      feature: bestFeature,
      threshold: bestThreshold,
      left: build(leftIndices, depth + 1),
      right: build(rightIndices, depth + 1),
    };
  }

  const root = build([...Array(features.length).keys()], 0);

  function predict(node, x) {
    if (node.leaf) return node.value;
    return x[node.feature] <= node.threshold ? predict(node.left, x) : predict(node.right, x);
  }

  return {
    predict: x => predict(root, x),
  };
}

function bootstrapSample(size) {
  const indices = [];
  for (let i = 0; i < size; i++) {
    indices.push(Math.floor(Math.random() * size));
  }
  return indices;
}

export function trainRandomForest(features, labels, options = {}) {
  const nTrees = options.nTrees || 50;
  const maxDepth = options.maxDepth || 8;
  const minSamples = options.minSamples || 3;
  const maxFeatures = options.maxFeatures || 0.6;

  const trees = [];
  for (let t = 0; t < nTrees; t++) {
    const sample = bootstrapSample(features.length);
    const sampleFeatures = sample.map(i => features[i]);
    const sampleLabels = sample.map(i => labels[i]);
    trees.push(regressionTree(sampleFeatures, sampleLabels, { maxDepth, minSamples, maxFeatures }));
  }

  return {
    predict: x => {
      let sum = 0;
      for (const tree of trees) sum += tree.predict(x);
      return sum / trees.length;
    },
    trees,
  };
}

export function evaluateModel(model, features, labels) {
  const preds = features.map(f => model.predict(f));
  return {
    mae: Number(MAE(labels, preds).toFixed(2)),
    rmse: Number(RMSE(labels, preds).toFixed(2)),
    mse: Number(MSE(labels, preds).toFixed(2)),
    samples: labels.length,
  };
}
