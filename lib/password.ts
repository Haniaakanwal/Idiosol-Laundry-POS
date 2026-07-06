export function generateTempPassword() {
  return Math.random().toString(36).slice(-6) + Math.floor(Math.random()*90+10);
}