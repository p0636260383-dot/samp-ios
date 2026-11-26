ROT CITY - ไอคอน / ชื่อไอเทม (UTF-8)
================================

ไฟล์หลัก: item-icons.js
รูปไอคอน 100 ชิ้น: assets/items/item_001.png ... item_100.png

การจับคู่:
  ไอเทม ID 0  = item_001.png
  ไอเทม ID 1  = item_002.png
  ...
  ไอเทม ID 99 = item_100.png

1) ชื่อภาษาไทย — แก้ NAMES_TH ใน item-icons.js

2) รูป (ตั้งค่าแล้วทั้ง 0-99)
   path ใน ICON_URLS แบบ relative จากหน้า CEF:
     "../rotcity-shared/assets/items/item_XXX.png"

3) เรียกใน UI
   RotItems.getName(id)
   RotItems.iconHTML(id, size)
   RotItems.setIconUrl(id, url)
   alias: RotItemIcons.name / RotItemIcons.iconHtml

4) ติดตั้ง client
   คัดลอก:
     client-ui/rotcity-shared/item-icons.js
     client-ui/rotcity-shared/assets/items/*.png
