import { describe, it } from 'node:test';
import assert from 'node:assert';
import { submitToIndexNow } from '../lib/indexing/indexNow';
import { submitToGoogleIndexingApi } from '../lib/indexing/googleIndexing';

describe('Indexing Submission Suite', () => {
  it('IndexNow handles empty url list error gracefully', async () => {
    await assert.rejects(
      async () => {
        await submitToIndexNow({
          host: 'example.com',
          urlList: [],
        });
      },
      /No URLs provided/
    );
  });

  it('Google Indexing API handles empty urls gracefully', async () => {
    const fakeKey = {
      client_email: 'test@example.iam.gserviceaccount.com',
      private_key: 'fake_key',
    };

    const res = await submitToGoogleIndexingApi(fakeKey, []);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.totalRequested, 0);
  });

  it('Google Indexing API rejects missing credentials', async () => {
    const invalidKey = {
      client_email: '',
      private_key: '',
    };

    await assert.rejects(
      async () => {
        await submitToGoogleIndexingApi(invalidKey, ['https://example.com/test']);
      },
      /Invalid Service Account Key/
    );
  });
});
