import { PollingTransport } from "../../adapters/polling-transport.js";
import { decodeRequest } from "../../engine/extensions/network-protocol.js";
import { NetworkGateway } from "../../engine/extensions/network-gateway.js";
import { NetworkSession } from "../../engine/extensions/network-session.js";
import {
  createLoopbackTransport,
  WebSocketTransport,
} from "../../adapters/network-transport.js";
/** Optional extension connection page. It owns protocol diagnostics, not gameplay rules. */
export function createNetworkInterface(
  game,
  { modal, root, escapeHTML, showMenu, toast, document: doc },
) {
  let connection = null,
    sender = null,
    sessionId = null,
    sequence = 1,
    last = null,
    response = null,
    connecting = false,
    pending = false,
    connectionEpoch = 0;
  let status = "尚未连接",
    endpoint = new URL("/control", doc?.defaultView?.location?.href || "http://127.0.0.1:5173/").href;
  const update = () => {
    for (const button of root.querySelectorAll(
      "[data-network-send], [data-network-retry]",
    ))
      button.disabled = pending || !sender;
    const connect = root.querySelector("[data-network-connect]");
    if (connect) connect.disabled = connecting;
    const node = root.querySelector("[data-network-status]");
    if (node) node.textContent = status;
    const result = root.querySelector("[data-network-result]");
    if (result)
      result.textContent = response
        ? JSON.stringify(response, null, 2).slice(0, 4000)
        : "等待命令。";
  };
  const disconnect = () => {
    connectionEpoch++;
    connecting = false;
    connection?.close();
    connection = null;
    sender = null;
    last = null;
    pending = false;
    status = "已断开";
    update();
  };
  const open = (transport) => {
    sessionId = "game-" + crypto.randomUUID();
    sequence = 1;
    last = null;
    response = null;
    const gateway = new NetworkGateway({
      bus: game.commandBus,
      session: sessionId,
    });
    connection = new NetworkSession({
      gateway,
      transport,
      onError: (error) => {
        status = "连接出错：" + error.message;
        update();
      },
      onResponse: (result) => {
        pending = false;
        response = result;
        update();
      },
    });
    transport.onClose(() => {
      status = "已断开";
      sender = null;
      pending = false;
      update();
    });
  };
  const local = () => {
    disconnect();
    const pair = createLoopbackTransport();
    sender = pair.client;
    open(pair.server);
    status = "本地协议验证已连接";
    update();
  };
  const socket = async () => {
    if (connecting) return;
    disconnect();
    connecting = true;
    const epoch = connectionEpoch;
    status = "正在连接…";
    update();
    try {
      const transport = await (endpoint.startsWith("http")
        ? PollingTransport.connect(endpoint)
        : WebSocketTransport.connect(endpoint));
      if (epoch !== connectionEpoch) {
        transport.close();
        return;
      }
      open(transport);
      status = "控制通道已连接，等待扩展命令";
    } catch (error) {
      if (epoch === connectionEpoch) status = "未能连接：" + error.message;
    } finally {
      if (epoch === connectionEpoch) {
        connecting = false;
        update();
      }
    }
  };
  const send = () => {
    if (!sender || sender.closed) {
      toast("请先开启本地协议验证。");
      return;
    }
    try {
      const input = JSON.parse(
        root.querySelector("[data-network-command]").value,
      );
      if (
        !input ||
        Object.keys(input).some(
          (k) => !["command", "input", "policy"].includes(k),
        )
      )
        throw new Error("命令只接受 command、input 和 policy");
      const request = {
        protocol: 1,
        type: "command",
        session: sessionId,
        id: `${sessionId}-${sequence}`,
        sequence,
        command: input.command,
        input: input.input || {},
        ...(input.policy ? { policy: input.policy } : {}),
      };
      const raw = JSON.stringify(request);
      // Local panel also passes the wire decoder before sending; bad syntax must not consume its sequence.
      decodeRequest(raw);
      pending = true;
      sender.send(raw);
      last = raw;
      sequence++;
      update();
    } catch (error) {
      toast(error.message);
    }
  };
  function showNetwork() {
    modal(
      "扩展连接",
      `<p>扩展可以发送命令控制当前单机冒险。本地验证用于检查消息格式；WebSocket 连接需要你自己的扩展服务。</p>
    <p data-network-status></p><div class="inline-actions"><button class="secondary-button" data-network-local>本地协议验证</button><button class="secondary-button" data-network-close>断开连接</button></div>
    <label>扩展服务地址<input data-network-url type="url" value="${escapeHTML(endpoint)}" aria-label="扩展服务地址"></label><button class="secondary-button" data-network-connect>连接控制通道</button>
    <details><summary>本地命令测试</summary><label>命令 JSON<textarea data-network-command aria-label="命令 JSON" rows="5">${escapeHTML(JSON.stringify({ command: "core.query", input: {} }, null, 2))}</textarea></label><div class="inline-actions"><button class="primary-button" data-network-send>发送测试命令</button><button class="secondary-button" data-network-retry>重发上一请求</button></div><pre data-network-result></pre></details>`,
      { type: "network", back: showMenu },
    );
    root.querySelector("[data-network-local]").onclick = local;
    root.querySelector("[data-network-close]").onclick = disconnect;
    root.querySelector("[data-network-connect]").onclick = () => {
      endpoint = root.querySelector("[data-network-url]").value;
      void socket();
    };
    root.querySelector("[data-network-send]").onclick = send;
    root.querySelector("[data-network-retry]").onclick = () => {
      if (sender && last) sender.send(last);
      else toast("还没有可重发的请求。");
    };
    update();
  }
  return {
    connectControl: (url = endpoint) => { endpoint = url; return socket(); }, showNetwork, disconnect };
}
