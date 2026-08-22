/**
 * The create flow must not render editable fields while Firebase is still
 * resolving the current account. Otherwise the late auth result reloads the
 * model and discards the in-progress step in the UI.
 */
export function canLoadCreateSession(authLoading: boolean): boolean {
  return !authLoading;
}
