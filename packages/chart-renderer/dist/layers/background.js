export function drawBackground(ctx, _data, theme, _dim) {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
//# sourceMappingURL=background.js.map