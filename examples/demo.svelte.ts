/**
 * デモアプリケーションのエントリーポイント
 */

import Demo from './demo.svelte';

const app = new Demo({
  target: document.getElementById('app')!
});

export default app;
