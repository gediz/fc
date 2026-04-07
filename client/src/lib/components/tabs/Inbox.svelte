<script lang="ts">
  import { inboxMessages, inboxUnread, getInbox, markRead, markAllRead, deleteMessage, deleteAllMessages, deleteConversation, privateMsg, viewPlayer, inboxComposeTo, player, acceptFriend, denyFriend, removeFriend, onlinePlayers } from '../../stores/game.js';
  import { send } from '../../stores/connection.js';
  import { onMount } from 'svelte';

  onMount(() => {
    getInbox();
    // Pre-fill compose if navigated from profile
    if ($inboxComposeTo) {
      composeTarget = $inboxComposeTo;
      showCompose = true;
      $inboxComposeTo = '';
    }
  });

  let replyTo: string | null = null;
  let replyText: string = '';
  let expandedSender: string | null = null;
  let composeTarget: string = '';
  let composeText: string = '';
  let showCompose: boolean = false;


  function sendCompose() {
    if (!composeTarget.trim() || !composeText.trim()) return;
    privateMsg(composeTarget.trim(), composeText.trim());
    composeText = '';
    showCompose = false;
  }

  // Group messages by sender (conversation view)
  $: conversations = (() => {
    const map = new Map<string, typeof $inboxMessages>();
    for (const msg of $inboxMessages) {
      if (!map.has(msg.from)) map.set(msg.from, []);
      map.get(msg.from)!.push(msg);
    }
    // Sort each conversation by timestamp (newest last)
    const result: { sender: string; messages: typeof $inboxMessages; latest: number; unreadCount: number; latestText: string }[] = [];
    for (const [sender, msgs] of map) {
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      const latest = msgs[msgs.length - 1];
      const unreadCount = msgs.filter(m => !m.read).length;
      result.push({ sender, messages: msgs, latest: latest.timestamp, unreadCount, latestText: latest.text });
    }
    // Sort conversations by latest message (newest first)
    result.sort((a, b) => b.latest - a.latest);
    return result;
  })();

  function sendReply() {
    if (!replyText.trim() || !replyTo) return;
    privateMsg(replyTo, replyText.trim());
    replyText = '';
  }

  function toggleConversation(sender: string) {
    if (expandedSender === sender) {
      expandedSender = null;
      replyTo = null;
    } else {
      expandedSender = sender;
      replyTo = sender;
      // Mark all unread messages from this sender as read
      const conv = conversations.find(c => c.sender === sender);
      if (conv) {
        for (const msg of conv.messages) {
          if (!msg.read) markRead(msg.id);
        }
      }
    }
  }

  let deleteConfirmSender: string | null = null;

  function handleDeleteConversation(e: MouseEvent, sender: string) {
    e.stopPropagation();
    deleteConfirmSender = sender;
  }
  function confirmDeleteConversation() {
    if (deleteConfirmSender) {
      deleteConversation(deleteConfirmSender);
      if (expandedSender === deleteConfirmSender) { expandedSender = null; replyTo = null; }
      deleteConfirmSender = null;
    }
  }

  let showClearConfirm: boolean = false;

  function handleClearAll() {
    showClearConfirm = true;
  }
  function confirmClearAll() {
    deleteAllMessages();
    expandedSender = null;
    replyTo = null;
    showClearConfirm = false;
  }

  function timeAgo(ts: number) {
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  }
</script>

<div style="display:flex; flex-direction:column; gap:14px; max-width:700px">
  <!-- Header -->
  <div class="combat-arena" style="padding:14px 20px">
    <div style="display:flex; justify-content:space-between; align-items:center">
      <div>
        <h2 class="font-fantasy" style="font-size:22px; font-weight:700; color:#d4a853; margin:0">
          Conversations
        </h2>
        <p style="color:#8a8078; font-size:13px; margin:4px 0 0">
          {$inboxUnread > 0 ? `${$inboxUnread} unread` : 'No unread messages'}
        </p>
      </div>
      <div style="display:flex; gap:6px">
        <button class="btn-game btn-gold" style="font-size:11px; padding:5px 10px" onclick={() => { showCompose = !showCompose; }}>
          + New Message
        </button>
        {#if $inboxUnread > 0}
          <button class="btn-game btn-dark" style="font-size:11px; padding:5px 10px" onclick={markAllRead}>
            Mark all read
          </button>
        {/if}
        {#if conversations.length > 0}
          <button class="btn-game" style="font-size:11px; padding:5px 10px; background:linear-gradient(180deg,#1a0808,#0d0404); color:#f87171; border:1px solid #7f1d1d" onclick={handleClearAll}>
            Clear All
          </button>
        {/if}
        <button class="btn-game btn-dark" style="font-size:11px; padding:5px 10px" onclick={getInbox}>
          Refresh
        </button>
      </div>
    </div>
  </div>

  <!-- Clear All Confirm -->
  {#if showClearConfirm}
    <div class="game-panel" style="border-color:#7f1d1d; background:linear-gradient(135deg,#1a0808,#0d0404)">
      <div style="padding:14px; text-align:center">
        <div style="font-size:14px; color:#fca5a5; margin-bottom:8px">Delete all conversations?</div>
        <div style="font-size:12px; color:#78716c; margin-bottom:12px">Messages will be removed from both sides. This cannot be undone.</div>
        <div style="display:flex; gap:8px; justify-content:center">
          <button class="btn-game btn-fight" style="padding:8px 20px; font-size:13px" onclick={confirmClearAll}>Delete All</button>
          <button class="btn-game btn-dark" style="padding:8px 20px; font-size:13px" onclick={() => showClearConfirm = false}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- New Message Compose -->
  {#if showCompose}
    <div class="game-panel" style="border-color:#d4a853">
      <div class="game-panel-header" style="color:#d4a853">New Message</div>
      <div style="padding:10px; display:flex; flex-direction:column; gap:8px">
        <input type="text" bind:value={composeTarget} placeholder="Player name..."
          style="padding:8px 12px; background:#0a0908; border:1px solid #2a2520; border-radius:8px; color:#e8e6dc; font-size:13px" />
        <input type="text" bind:value={composeText} placeholder="Your message..."
          onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && sendCompose()}
          style="padding:8px 12px; background:#0a0908; border:1px solid #2a2520; border-radius:8px; color:#e8e6dc; font-size:13px" />
        <div style="display:flex; gap:6px">
          <button class="btn-game btn-gold" style="flex:1; padding:8px" onclick={sendCompose}>Send</button>
          <button class="btn-game btn-dark" style="padding:8px 16px" onclick={() => showCompose = false}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Conversations -->
  <div class="game-panel">
    <div class="game-panel-header">Inbox ({conversations.length} conversation{conversations.length !== 1 ? 's' : ''})</div>
    {#if conversations.length === 0}
      <div style="padding:32px; text-align:center; color:#78716c; font-size:13px">
        No messages yet. Other players can send you messages from your profile.
      </div>
    {:else}
      <div style="display:flex; flex-direction:column">
        {#each conversations as conv}
          <!-- Conversation row -->
          <div style="display:flex; align-items:center; border-bottom:1px solid #1a1714;
            background:{expandedSender === conv.sender ? 'rgba(212,168,83,0.06)' : (conv.unreadCount > 0 ? 'rgba(212,168,83,0.03)' : 'transparent')}">
            <button
              style="flex:1; padding:10px 14px; display:flex; gap:10px; align-items:center;
                cursor:pointer; text-align:left; border:none; color:inherit; font:inherit; background:transparent"
              onclick={() => toggleConversation(conv.sender)}>
              <!-- Unread indicator -->
              <div style="width:8px; height:8px; border-radius:50%; flex-shrink:0;
                background:{conv.unreadCount > 0 ? '#d4a853' : '#2a2520'}"></div>

              <div style="flex:1; min-width:0">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:3px">
                  <span style="color:#d4a853; font-weight:600; font-size:13px">
                    {conv.sender}
                    {#if conv.unreadCount > 0}
                      <span style="font-size:10px; background:#d4a853; color:#0a0908; border-radius:8px; padding:1px 5px; margin-left:4px; font-weight:700">{conv.unreadCount}</span>
                    {/if}
                  </span>
                  <span style="font-size:10px; color:#4b5563; flex-shrink:0">{timeAgo(conv.latest)}</span>
                </div>
                <div style="font-size:12px; color:#8a8078; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
                  {conv.latestText}
                </div>
              </div>

              <span style="font-size:12px; color:#4b5563; flex-shrink:0">{expandedSender === conv.sender ? '▼' : '▶'}</span>
            </button>
            <button
              style="background:none; border:none; color:#78716c; cursor:pointer; font-size:14px; padding:8px 10px; flex-shrink:0"
              title="Delete conversation"
              onclick={(e: MouseEvent) => handleDeleteConversation(e, conv.sender)}>
              🗑
            </button>
          </div>

          <!-- Delete confirm -->
          {#if deleteConfirmSender === conv.sender}
            <div style="padding:10px 14px; background:#1a0808; border-bottom:1px solid #7f1d1d; display:flex; align-items:center; justify-content:center; gap:8px">
              <span style="font-size:12px; color:#fca5a5">Delete conversation with {conv.sender}?</span>
              <button class="btn-game btn-fight" style="padding:4px 12px; font-size:11px" onclick={confirmDeleteConversation}>Delete</button>
              <button class="btn-game btn-dark" style="padding:4px 12px; font-size:11px" onclick={() => deleteConfirmSender = null}>Cancel</button>
            </div>
          {/if}

          <!-- Expanded conversation -->
          {#if expandedSender === conv.sender}
            <div style="background:rgba(0,0,0,0.2); border-bottom:1px solid #1a1714">
              <!-- Back button -->
              <button
                style="padding:10px 14px; font-size:13px; font-weight:600; color:#d4a853; background:linear-gradient(180deg,#1c1608,#151210); border:none; border-bottom:2px solid #3d2a15; cursor:pointer; width:100%; text-align:left; display:flex; align-items:center; gap:6px"
                onclick={() => { expandedSender = null; replyTo = null; }}>
                <span style="font-size:16px">&#8592;</span> Back to Conversations
              </button>
              <!-- All messages from this sender -->
              {#each conv.messages as msg}
                <div style="padding:8px 14px 8px {msg.sent ? '14px' : '32px'}; display:flex; gap:8px; align-items:flex-start; border-bottom:1px solid rgba(26,23,20,0.5); {msg.sent ? 'background:rgba(212,168,83,0.03); border-left:3px solid #3d2a15;' : ''}">
                  <div style="flex:1; min-width:0">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:2px">
                      <button style="background:none; border:none; color:{msg.sent ? '#d4a853' : '#a08050'}; font-size:11px; cursor:pointer; padding:0"
                        onclick={(e: MouseEvent) => { e.stopPropagation(); viewPlayer(msg.sent ? conv.sender : msg.from); }}>
                        {msg.sent ? 'You' : msg.from}
                      </button>
                      <span style="font-size:10px; color:#4b5563; flex-shrink:0">{timeAgo(msg.timestamp)}</span>
                    </div>
                    <div style="font-size:13px; color:{msg.sent ? '#b0a898' : '#e2e0d6'}; line-height:1.4">{msg.sent ? msg.text.replace(/^You: /, '') : msg.text}</div>
                  </div>
                  {#if msg.sent}
                    <button style="background:none; border:none; color:#4b5563; cursor:pointer; font-size:12px; padding:4px; flex-shrink:0"
                      title="Delete sent message"
                      onclick={(e: MouseEvent) => { e.stopPropagation(); deleteMessage(msg.id); }}>
                      ✕
                    </button>
                  {/if}
                </div>
              {/each}

              <!-- Reply box for this conversation -->
              <div style="padding:8px 14px 10px 32px; display:flex; gap:8px">
                <input type="text" bind:value={replyText} placeholder="Reply to {conv.sender}..."
                  onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && sendReply()}
                  style="flex:1; padding:8px 12px; background:#0a0908; border:1px solid #2a2520; border-radius:8px; color:#e8e6dc; font-size:13px" />
                <button class="btn-game btn-gold" style="padding:8px 16px" onclick={sendReply}>Send</button>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <!-- Friend Requests -->
  {#if ($player?.friendRequests || []).length > 0}
    <div class="game-panel" style="border-color:#d4a853">
      <div class="game-panel-header" style="color:#d4a853">Friend Requests ({$player.friendRequests.length})</div>
      <div style="padding:8px; display:flex; flex-direction:column; gap:4px">
        {#each $player.friendRequests as req}
          <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:#0a0908; border:1px solid #1a1714; border-radius:6px">
            <button style="flex:1; text-align:left; background:none; border:none; color:#e8e6dc; font-size:13px; cursor:pointer; padding:0" onclick={() => viewPlayer(req)}>
              {req}
            </button>
            <button class="btn-game btn-gold" style="font-size:10px; padding:3px 10px" onclick={() => acceptFriend(req)}>Accept</button>
            <button class="btn-game btn-dark" style="font-size:10px; padding:3px 10px" onclick={() => denyFriend(req)}>Deny</button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Friends List -->
  <div class="game-panel">
    <div class="game-panel-header">Friends ({($player?.friends || []).length})</div>
    <div style="padding:8px">
      {#if ($player?.friends || []).length === 0}
        <div style="text-align:center; color:#78716c; padding:16px; font-size:13px">No friends yet. Visit a player's profile to add them.</div>
      {:else}
        <div style="display:flex; flex-direction:column; gap:4px">
          {#each $player?.friends || [] as friend}
            {@const isOnline = $onlinePlayers.some(p => p.name === friend)}
            <div style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:#0a0908; border:1px solid #1a1714; border-radius:6px">
              <div style="width:8px; height:8px; border-radius:50%; background:{isOnline ? '#4ade80' : '#4b5563'}"></div>
              <button style="flex:1; text-align:left; background:none; border:none; color:#e8e6dc; font-size:13px; cursor:pointer; padding:0" onclick={() => viewPlayer(friend)}>
                {friend}
              </button>
              <span style="font-size:10px; color:{isOnline ? '#4ade80' : '#4b5563'}">{isOnline ? 'online' : 'offline'}</span>
              <button style="background:none; border:none; color:#78716c; cursor:pointer; font-size:12px; padding:2px 4px" onclick={() => removeFriend(friend)}>
                ✕
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Blocked -->
  {#if ($player?.blocked || []).length > 0}
    <div class="game-panel">
      <div class="game-panel-header">Blocked ({$player.blocked.length})</div>
      <div style="padding:8px; display:flex; flex-wrap:wrap; gap:4px">
        {#each $player.blocked as blocked}
          <span style="font-size:12px; padding:4px 8px; background:#1a0808; border:1px solid #3d1515; border-radius:6px; color:#f87171">
            {blocked}
            <button style="background:none; border:none; color:#78716c; cursor:pointer; margin-left:4px" onclick={() => send({ type: 'block_player', name: blocked })}>✕</button>
          </span>
        {/each}
      </div>
    </div>
  {/if}
</div>
