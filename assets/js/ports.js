import {
  createPhoenixSocket,
  createAbsintheSocket,
  updateSocketToken
} from "./socket";
import { getApiToken } from "./token";
import * as AbsintheSocket from "@absinthe/socket";
import autosize from "autosize";

const logEvent = eventName => (...args) => console.log(eventName, ...args);

export const attachPorts = app => {
  let phoenixSocket = createPhoenixSocket(getApiToken());
  let absintheSocket = createAbsintheSocket(phoenixSocket);

  app.ports.updateToken.subscribe(token => {
    updateSocketToken(phoenixSocket, token);
    app.ports.socketTokenUpdated.send();
  });

  app.ports.sendSocket.subscribe(doc => {
    const notifier = AbsintheSocket.send(absintheSocket, doc);

    AbsintheSocket.observe(absintheSocket, notifier, {
      onAbort: data => {
        logEvent("abort")(data);
        app.ports.socketAbort.send(data);
      },
      onError: data => {
        logEvent("error")(data);
        app.ports.socketError.send(data);
      },
      onStart: data => {
        logEvent("start")(data);
        app.ports.socketStart.send(data);
      },
      onResult: data => {
        logEvent("result")(data);
        app.ports.socketResult.send(data);
      }
    });
  });

  app.ports.cancelSocket.subscribe(clientId => {
    const notifiers = absintheSocket.notifiers.filter(notifier => {
      return notifier.request.clientId == clientId;
    });

    notifiers.forEach(notifier => {
      logEvent("cancel")(notifier);
      AbsintheSocket.cancel(absintheSocket, notifier);
    });
  });

  app.ports.scrollTo.subscribe(arg => {
    const { containerId, anchorId, offset } = arg;

    requestAnimationFrame(() => {
      if (containerId === "DOCUMENT") {
        let container = document.documentElement;
        let anchor = document.getElementById(anchorId);
        if (!anchor) return;

        let rect = anchor.getBoundingClientRect();
        container.scrollTop = container.scrollTop + rect.top - offset;
      } else {
        let container = document.getElementById(containerId);
        let anchor = document.getElementById(anchorId);
        if (!(container && anchor)) return;

        container.scrollTop = anchor.offsetTop + offset;
      };
    });
  });

  app.ports.scrollToBottom.subscribe(arg => {
    const { containerId } = arg;

    requestAnimationFrame(() => {
      if (containerId === "DOCUMENT") {
        let container = document.documentElement;
        container.scrollTop = container.scrollHeight;
      } else {
        let container = document.getElementById(containerId);
        if (!container) return;
        container.scrollTop = container.scrollHeight;
      };
    });
  });

  app.ports.autosize.subscribe(arg => {
    const { method, id } = arg;

    requestAnimationFrame(() => {
      let node = document.getElementById(id);
      autosize(node);
      if (method === "update") autosize.update(node);
      if (method === "destroy") autosize.destroy(node);
    });
  });

  app.ports.select.subscribe(id => {
    requestAnimationFrame(() => {
      let node = document.getElementById(id);
      node.select();
    });
  });
};
