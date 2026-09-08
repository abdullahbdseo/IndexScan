import { WebsiteAccessProvider } from './WebsiteAccessProvider.js';
import { LocalFsAdapter } from './LocalFsAdapter.js';
import { WordPressAdapter, GitAdapter, SftpAdapter, ShopifyAdapter, GenericHttpAdapter } from './RemoteAdapters.js';
import { AdapterType } from '../types/index.js';

export class AdapterFactory {
  private static adapters: Map<AdapterType, WebsiteAccessProvider> = new Map([
    ['local_fs', new LocalFsAdapter()],
    ['wordpress', new WordPressAdapter()],
    ['git', new GitAdapter()],
    ['sftp', new SftpAdapter()],
    ['shopify', new ShopifyAdapter()],
    ['generic_api', new GenericHttpAdapter()]
  ]);

  public static getAdapter(type: AdapterType): WebsiteAccessProvider {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Unsupported or unknown adapter type: ${type}`);
    }
    return adapter;
  }
}
