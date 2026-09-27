import {test,describe} from 'node:test';
import assert from 'node:assert';
import {trainRandomForest, evaluateModel} from '../../services/mlService.js';

describe('mlService',()=>{
  test('trains a model and predicts within reasonable range',()=>{
    const features=[[0,0,2],[0,0,1],[0,1,2],[0,1,1],[1,0,2],[1,0,1],[1,1,2],[1,1,1]];
    const labels=[8,4,12,6,8,4,12,6];
    const model=trainRandomForest(features,labels,{nTrees:20,maxDepth:3,minSamples:1,maxFeatures:0.8});
    const pred=model.predict([0,0,2]);
    assert.ok(pred>=5&&pred<=11,'prediction should be near expected value');
  });
  test('evaluateModel returns mae and rmse',()=>{
    const features=[[0],[1],[2],[3]];
    const labels=[0,2,4,6];
    const model=trainRandomForest(features,labels,{nTrees:10,maxDepth:2,minSamples:1,maxFeatures:1});
    const metrics=evaluateModel(model,features,labels);
    assert.ok(typeof metrics.mae==='number','mae should be a number');
    assert.ok(typeof metrics.rmse==='number','rmse should be a number');
    assert.ok(metrics.rmse>=metrics.mae,'rmse should be >= mae');
  });
  test('returns metrics object with required fields',()=>{
    const features=[[0],[1]];
    const labels=[0,1];
    const model=trainRandomForest(features,labels,{nTrees:5,maxDepth:2,minSamples:1,maxFeatures:1});
    const metrics=evaluateModel(model,features,labels);
    assert.ok('mae' in metrics,'metrics should include mae');
    assert.ok('rmse' in metrics,'metrics should include rmse');
    assert.ok('mse' in metrics,'metrics should include mse');
    assert.ok('samples' in metrics,'metrics should include samples');
  });
});
