export function confirmSubmit(message: string) {
  return (event: SubmitEvent) => {
    if (!window.confirm(message)) {
      event.preventDefault();
    }
  };
}

export function confirmEnhance(message: string) {
  return ({ cancel }: { cancel: () => void }) => {
    if (!window.confirm(message)) cancel();
  };
}
