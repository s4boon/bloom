export function observeClassChanges(
  callback: () => void,
  root: Node = document.body,
) {
  const observer = new MutationObserver((mutations) => {
    // mutations only contains 'class' attribute changes, per the filter below
    callback();
  });

  observer.observe(root, {
    attributes: true,
    attributeFilter: ["class"],
    subtree: true,
  });

  return () => observer.disconnect();
}
