ROT CITY Shared Item Icons
==========================

ไฟล์: item-icons.js

ใช้ร่วมทุก UI ฝั่ง client:
  - rotcity-inventory
  - rotcity-storage
  - (อนาคต) craft / shop / quest reward

วิธีใช้ใน HTML:
  <script src="../rotcity-shared/item-icons.js"></script>
  RotItems.getIcon(itemId)  -> { icon, color, label }
  RotItems.getName(itemId)  -> ชื่อไทย
  RotItems.slotHTML(id, amount, weight) -> HTML ช่องไอเทม

โครงสร้างโฟลเดอร์ที่แนะนำบน CEF client:
  <cef-resources>/
    rotcity-shared/item-icons.js
    rotcity-inventory/index.html
    rotcity-storage/index.html

เพิ่มไอเทมใหม่: แก้เฉพาะ item-icons.js ครั้งเดียว ทุก UI ได้ไอคอนเดียวกัน
