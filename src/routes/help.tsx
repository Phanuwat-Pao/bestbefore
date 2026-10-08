import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/help")({ component: HelpPage });

function HelpPage() {
  return (
    <section className="stack">
      <h1>วิธีใช้</h1>
      <div className="card stack">
        <h2>เพิ่มของ</h2>
        <p>
          กด <strong>เพิ่ม</strong> แล้วถ่ายรูปด้านหน้าสินค้าและวันหมดอายุ
          ระบบจะอ่านชื่อและวันที่ให้ ตรวจสอบแล้วกดบันทึก ถ้าอ่านไม่ได้ก็กรอกเองได้
        </p>
        <p className="muted small">
          วันที่บนฉลากไทยมักเป็น วัน/เดือน/ปี พ.ศ. เช่น 15/10/69 คือ 15 ต.ค. 2569
        </p>
      </div>
      <div className="card stack">
        <h2>ในกลุ่ม LINE</h2>
        <p>แท็กบอทในกลุ่มแล้วพิมพ์คำสั่ง</p>
        <ul className="plain">
          <li>
            <code>@BestBefore</code> หรือ <code>รายการ</code>: ของทั้งหมด
            เรียงใกล้หมดอายุก่อน
          </li>
          <li>
            <code>ใกล้หมด</code>: ของที่ใกล้หมดอายุ
          </li>
          <li>
            <code>หมดแล้ว</code>: ของที่หมดอายุแล้ว
          </li>
          <li>
            <code>ประวัติ</code>: ของที่ใช้แล้ว
          </li>
          <li>
            <code>ช่วย</code>: รายการคำสั่ง
          </li>
        </ul>
        <p className="muted small">
          ในรายการมีปุ่ม ใช้แล้ว แก้ไข และ ลบ ให้กดได้เลย ถ้ามีของใกล้หมดอายุ
          บอทจะตอบเตือนต่อท้ายข้อความในกลุ่มวันละครั้ง
        </p>
      </div>
      <div className="card stack">
        <h2>แชทส่วนตัวกับบอท</h2>
        <p>พิมพ์คำสั่งเดียวกันได้โดยไม่ต้องแท็ก และมีปุ่มเพิ่มของในเมนูด้านล่าง</p>
      </div>
      <div className="card stack">
        <h2>การแจ้งเตือน</h2>
        <p>
          เปิดการแจ้งเตือนในหน้าตั้งค่า จะได้สรุปของใกล้หมดอายุทุกเช้า บน iPhone ต้องเปิดเว็บนี้ใน
          Safari แล้วเพิ่มไปยังหน้าจอโฮมก่อน
        </p>
      </div>
    </section>
  );
}
