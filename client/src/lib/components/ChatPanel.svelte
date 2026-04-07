<script lang="ts">
  import { chatMessages, sendChat, privateMsg, guildChat } from '../stores/game.js';
  import { afterUpdate } from 'svelte';

  let chatInput: string = '';
  let chatBox: HTMLElement;
  let chatFilter: string = 'all';

  afterUpdate(() => { if (chatBox) chatBox.scrollTop = chatBox.scrollHeight; });

  function handleSend() {
    const text = chatInput.trim();
    if (!text) return;
    chatInput = '';

    // /w PlayerName message — whisper
    const whisperMatch = text.match(/^\/w\s+(\S+)\s+(.+)/i);
    if (whisperMatch) {
      privateMsg(whisperMatch[1], whisperMatch[2]);
      return;
    }

    // /g message — guild chat
    if (text.startsWith('/g ')) {
      guildChat(text.slice(3));
      return;
    }

    sendChat(text);
  }
</script>

<div class="flex-1 flex flex-col p-3 min-h-0">
  <div class="font-fantasy text-xs font-semibold text-yellow-700 uppercase tracking-widest mb-2">Chat</div>
  <div style="display:flex; gap:4px; margin-bottom:4px;">
    {#each [['all','All'],['user','Chat'],['guild','Guild'],['pm','PM'],['system','Sys']] as [key, label]}
      <button
        style="padding:2px 6px; font-size:10px; border-radius:4px; cursor:pointer;
          border:1px solid {chatFilter === key ? '#ca8a04' : '#2a2520'};
          background:{chatFilter === key ? '#713f12' : '#0f0d0b'};
          color:{chatFilter === key ? '#fef3c7' : '#78716c'};"
        onclick={() => chatFilter = key}>{label}</button>
    {/each}
  </div>
  <div bind:this={chatBox} class="flex-1 overflow-y-auto rounded-lg p-2.5 text-sm space-y-1 min-h-[150px] max-h-[300px] scroll-smooth"
    style="background: #0a0908; border: 1px solid #1a1714">
    {#each $chatMessages.filter(m => chatFilter === 'all' || m.type === chatFilter) as msg}
      <div>
        <span class="{msg.type === 'system' ? 'text-green-500 italic' : msg.type === 'guild' ? 'text-orange-400' : msg.type === 'pm' ? 'text-blue-400' : 'text-yellow-500'} font-semibold">[{msg.user}]</span>
        <span class="{msg.type === 'pm' ? 'text-blue-300' : msg.type === 'guild' ? 'text-orange-200' : 'text-gray-300'}">{msg.text}</span>
      </div>
    {/each}
  </div>
  <div style="font-size:10px; color:#4b5563; margin-top:4px; margin-bottom:2px">/w name msg = whisper · /g msg = guild</div>
  <div class="flex gap-1">
    <input type="text" bind:value={chatInput} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && handleSend()}
      placeholder="Say... (/w name msg to whisper)"
      class="flex-1 min-w-0 px-2 py-2 text-sm bg-[#0a0908] border border-[#1a1714] rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#2a2520]" />
    <button onclick={handleSend} class="shrink-0 w-9 h-9 flex items-center justify-center bg-[#1a1714] hover:bg-[#2a2520] border border-[#2a2520] rounded-lg text-yellow-500 text-lg transition-colors">›</button>
  </div>
</div>
