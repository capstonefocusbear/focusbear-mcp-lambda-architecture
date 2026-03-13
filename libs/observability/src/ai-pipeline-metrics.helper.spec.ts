const sendMock = jest.fn();

jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn(() => ({
    send: sendMock,
  })),
  PutMetricDataCommand: jest.fn(function PutMetricDataCommand(input: any) {
    return { input };
  }),
  StandardUnit: {
    Milliseconds: 'Milliseconds',
    Count: 'Count',
  },
}));

import { emitAiPipelineMetrics } from './ai-pipeline-metrics.helper';

describe('emitAiPipelineMetrics', () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({});
  });

  it('emits optional end-to-end and queue wait metrics when provided', async () => {
    await emitAiPipelineMetrics({
      namespace: 'FocusBear/AiPipelines',
      environment: 'prod',
      service: 'api',
      pipeline: 'habit-import',
      operation: 'processHabitImport',
      success: true,
      durationMs: 1_200,
      endToEndDurationMs: 2_500,
      queueWaitMs: 300,
      stageDurationsMs: { totalMs: 1_200 },
      counters: { matchedCount: 2 },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    const metricNames = command.input.MetricData.map((datum: any) => datum.MetricName);

    expect(metricNames).toEqual(
      expect.arrayContaining([
        'AiPipelineDurationMs',
        'AiPipelineSuccess',
        'AiPipelineEndToEndDurationMs',
        'AiPipelineQueueWaitMs',
        'AiPipelineStageDurationMs',
        'matchedCount',
      ]),
    );
  });

  it('omits optional latency metrics when they are not provided', async () => {
    await emitAiPipelineMetrics({
      namespace: 'FocusBear/AiPipelines',
      environment: 'prod',
      service: 'api',
      pipeline: 'adjust-habits',
      operation: 'adjustHabitsWithAi',
      success: false,
      durationMs: 900,
      stageDurationsMs: {},
      counters: {},
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    const metricNames = command.input.MetricData.map((datum: any) => datum.MetricName);

    expect(metricNames).toEqual(expect.arrayContaining(['AiPipelineDurationMs', 'AiPipelineSuccess']));
    expect(metricNames).not.toContain('AiPipelineEndToEndDurationMs');
    expect(metricNames).not.toContain('AiPipelineQueueWaitMs');
  });
});
