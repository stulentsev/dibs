export function confirmSubmit(message: string) {
  return (event: SubmitEvent) => {
    if (!window.confirm(message)) {
      event.preventDefault();
    }
  };
}
