declare module 'digest-fetch' {
  type DigestOptions = {
    algorithm?: 'MD5' | 'SHA-256' | 'SHA-512';
    statusCode?: number;
  };

  class DigestClient {
    constructor(username: string, password: string, options?: DigestOptions);
    fetch(url: string, options?: RequestInit): Promise<Response>;
  }

  export default DigestClient;
} 