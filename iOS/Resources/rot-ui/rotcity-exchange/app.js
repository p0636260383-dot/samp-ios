document.addEventListener("DOMContentLoaded", () => {
  const cef = window.cef;
  const amount = document.getElementById("amount");
  const preview = document.getElementById("preview");
  const status = document.getElementById("status");
  const submit = document.getElementById("submit");
  const cashout = document.getElementById("cashout");
  const format = value => Number(value).toLocaleString("th-TH");
  let rate = 0;
  let core = 0;
  let merit = 0;
  let pending;
  let withdrawFee = 0;
  const withdrawAmount = document.getElementById("withdraw-amount");
  const withdrawSubmit = document.getElementById("withdraw-submit");
  const withdrawPreview = document.getElementById("withdraw-preview");
  function updateWithdraw() {
    const quantity = withdrawAmount.valueAsNumber;
    const valid = Number.isSafeInteger(quantity) && withdrawAmount.validity.valid && quantity > 0;
    withdrawSubmit.disabled = !valid;
    withdrawPreview.textContent = valid ? "ยอดรับหลังหักค่าธรรมเนียม " + format(Math.floor(quantity * (100 - withdrawFee) / 100)) + " บาท" : "กรอกจำนวนตามขั้นต่ำและยอดคงเหลือ";
  }
  withdrawAmount.addEventListener("input", updateWithdraw);
  withdrawSubmit.addEventListener("click", () => action("2 " + withdrawAmount.valueAsNumber));
  document.getElementById("withdraw-history").addEventListener("click", () => action("history"));


  function updatePreview() {
    const quantity = amount.valueAsNumber;
    amount.max = core;
    const result = quantity * rate;
    const valid = rate > 0 && amount.validity.valid && Number.isSafeInteger(result) && result > 0;
    submit.disabled = !valid || Boolean(pending);
    preview.textContent = valid
      ? "จะได้รับ " + format(result) + " แต้มผลงาน"
      : "ระบุจำนวนเต็มตามอัตราแลกเปลี่ยนและยอดคงเหลือ";
  }

  function action(value) {
    if (cef) cef.emit("rotexchange.action", value);
  }

  amount.addEventListener("input", updatePreview);
  document.getElementById("close").addEventListener("click", () => action("close"));
  cashout.addEventListener("click", () => action("cashout"));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") action("close");
  });
  document.getElementById("exchange-form").addEventListener("submit", event => {
    event.preventDefault();
    if (submit.disabled) return;
    pending = setTimeout(() => {
      pending = null;
      status.textContent = "ยังไม่ได้รับผลจากเซิร์ฟเวอร์ กรุณาตรวจยอดคงเหลือก่อนแลกอีกครั้ง";
      submit.disabled = true;
    }, 5000);
    status.textContent = "กำลังบันทึกการแลกเปลี่ยน";
    updatePreview();
    action("0 " + amount.valueAsNumber);
  });

  if (!cef) return;
  cef.on("rotexchange.open", (newMerit, newCore, newRate, minimum, fee, cashoutMode) => {
    core = Number(newCore);
    merit = Number(newMerit);
    rate = Number(newRate);
    document.getElementById("core").textContent = format(core) + " CP";
    document.getElementById("merit").textContent = format(merit) + " แต้ม";
    document.getElementById("rate").textContent = "1 CP = " + format(rate) + " แต้มผลงาน";
    document.getElementById("cashout-terms").textContent = "ขั้นต่ำ " + format(minimum) + " CP · ค่าธรรมเนียม " + format(fee) + "%";
    const withdrawing = Number(cashoutMode) === 1;
    document.querySelector("h1").textContent = withdrawing ? "ถอนเงินบาท" : "ศูนย์แลกเปลี่ยน";
    document.getElementById("exchange-form").hidden = withdrawing;
    document.getElementById("cashout-link").hidden = withdrawing;
    document.getElementById("withdraw-panel").hidden = !withdrawing;
    if (withdrawing) document.getElementById("rate").textContent = "ขั้นต่ำ " + format(minimum) + " CP · ค่าธรรมเนียม " + format(fee) + "%";
    withdrawFee = Number(fee);
    withdrawAmount.min = Number(minimum);
    withdrawAmount.max = core;
    updateWithdraw();
    cashout.disabled = false;
    updatePreview();
  });
  cef.on("rotexchange.result", success => {
    clearTimeout(pending);
    pending = null;
    status.textContent = Number(success) === 1 ? "แลกเปลี่ยนเรียบร้อยแล้ว" : "แลกเปลี่ยนไม่สำเร็จ กรุณาตรวจยอดและจำนวนที่ระบุ";
    if (Number(success) === 1) amount.value = "";
    updatePreview();
  });
  cef.emit("rotexchange.ready");
});
