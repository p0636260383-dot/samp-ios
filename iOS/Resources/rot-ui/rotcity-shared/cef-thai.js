(function () {
  const decoder = new TextDecoder("windows-874");
  window.rotThai = value => {
    const text = String(value == null ? "" : value);
    if (!/^874:(?:[0-9A-F]{2})*$/i.test(text)) return text;
    const bytes = new Uint8Array((text.length - 4) / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(text.slice(4 + i * 2, 6 + i * 2), 16);
    return decoder.decode(bytes);
  };
})();
