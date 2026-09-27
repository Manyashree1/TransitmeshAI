export function createSocketController({
  socketFactory,
  onRefresh,
  onStatus,
  onEvent,
  eventNames = [
    'bus:stopReached',
    'bus:delayUpdated',
    'trip:started',
    'trip:ended',
    'crowd:updated',
    'bus:location',
    'ticketing:occupancyUpdated',
  ],
}) {
  const socket = socketFactory();

  const emitRefresh = () => {
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
  };

  const updateStatus = status => {
    if (typeof onStatus === 'function') {
      onStatus(status);
    }
  };

  socket.on('connect', () => {
    updateStatus('online');
    emitRefresh();
  });

  socket.on('disconnect', () => {
    updateStatus('offline');
  });

  socket.on('reconnect', () => {
    updateStatus('online');
    emitRefresh();
  });

  socket.on('reconnect_attempt', () => {
    updateStatus('reconnecting');
  });

  for (const eventName of eventNames) {
    socket.on(eventName, payload => {
      if (typeof onEvent === 'function') {
        onEvent(eventName, payload);
      }
      emitRefresh();
    });
  }

  return {
    socket,
    destroy() {
      for (const eventName of eventNames) {
        socket.off(eventName);
      }
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect');
      socket.off('reconnect_attempt');
      socket.disconnect();
    },
  };
}
