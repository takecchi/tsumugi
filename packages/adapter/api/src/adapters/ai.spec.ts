import type { AIStreamChunk } from '@tsumugi/adapter';
import { parseProposalSSEResponse } from './ai';

/** proposal-result フレームを組み立てる */
function proposalResultFrame(hasStream: boolean): string {
  const result = {
    type: 'proposal-result',
    result: {
      feedback: {
        tool_call_id: 'call_1',
        status: 'accepted',
        content_type: 'plot',
        target_id: 'plot_1',
      },
      has_stream: hasStream,
    },
  };
  return `data: ${JSON.stringify(result)}\n\n`;
}

async function drain(
  stream: ReadableStream<AIStreamChunk>,
): Promise<AIStreamChunk[]> {
  const reader = stream.getReader();
  const chunks: AIStreamChunk[] = [];
  let r = await reader.read();
  while (!r.done) {
    chunks.push(r.value);
    r = await reader.read();
  }
  return chunks;
}

describe('parseProposalSSEResponse', () => {
  it('先頭の proposal-result から feedback を取り出す', async () => {
    const sse =
      proposalResultFrame(false) +
      'data: {"type":"finish","message_id":null}\n\n';
    const result = await parseProposalSSEResponse(new Response(sse));

    expect(result.feedback).toEqual({
      toolCallId: 'call_1',
      status: 'accepted',
      contentType: 'plot',
      targetId: 'plot_1',
      conflictDetails: undefined,
    });
  });

  it('has_stream=false のときは stream を返さない', async () => {
    const sse =
      proposalResultFrame(false) +
      'data: {"type":"finish","message_id":null}\n\n';
    const result = await parseProposalSSEResponse(new Response(sse));
    expect(result.stream).toBeUndefined();
  });

  it('has_stream=true のとき、後続フレームを AI 応答ストリームとして返す', async () => {
    const sse =
      proposalResultFrame(true) +
      'data: {"type":"start"}\n\n' +
      'data: {"type":"text-start","id":"t1"}\n\n' +
      'data: {"type":"text-delta","id":"t1","delta":"承認しました。"}\n\n' +
      'data: {"type":"text-end","id":"t1"}\n\n' +
      'data: {"type":"finish","message_id":"msg_1"}\n\n';

    const result = await parseProposalSSEResponse(new Response(sse));
    expect(result.feedback.status).toBe('accepted');
    const stream = result.stream;
    if (!stream) throw new Error('expected result.stream to be defined');

    const chunks = await drain(stream);
    expect(chunks).toEqual([
      { type: 'text', content: '承認しました。' },
      { type: 'done', messageId: 'msg_1' },
    ]);
  });

  it('proposal-result が無いまま終了した場合は例外をスローする', async () => {
    const sse = 'data: {"type":"finish","message_id":null}\n\n';
    await expect(parseProposalSSEResponse(new Response(sse))).rejects.toThrow(
      'proposal-result',
    );
  });

  it('body が無い場合は例外をスローする', async () => {
    const noBody = { body: null } as Response;
    await expect(parseProposalSSEResponse(noBody)).rejects.toThrow(
      'No response body',
    );
  });
});
