export function stripMarkdownCodeFences(markdown) {
  const visibleLines = [];
  let activeFence = null;
  let activeFenceLength = 0;

  for (const line of markdown.split(/\r?\n/)) {
    const opening = line.match(/^[ \t]{0,3}(`{3,}|~{3,})(.*)$/);
    if (activeFence === null) {
      if (opening) {
        activeFence = opening[1][0];
        activeFenceLength = opening[1].length;
      } else {
        visibleLines.push(line);
      }
      continue;
    }

    const closing = line.match(/^[ \t]{0,3}(`+|~+)[ \t]*$/);
    if (closing && closing[1][0] === activeFence && closing[1].length >= activeFenceLength) {
      activeFence = null;
      activeFenceLength = 0;
    }
  }

  return visibleLines.join("\n");
}
