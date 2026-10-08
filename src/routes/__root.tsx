import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

import { ReloadPrompt } from "../components/reload-prompt";
import { useSession } from "../lib/session";

export const Route = createRootRoute({ component: Root });

function Root() {
  const { state } = useSession();
  return (
    <>
      <Gate />
      {state.kind === "ready" && <ReloadPrompt />}
    </>
  );
}

function Gate() {
  const { state } = useSession();
  switch (state.kind) {
    case "loading": {
      return <div className="center muted">กำลังเข้าสู่ระบบด้วย LINE…</div>;
    }
    case "notMember": {
      return <NotMember retry={state.retry} />;
    }
    case "error": {
      return (
        <div className="center">
          <div className="card">
            <h2>เกิดข้อผิดพลาด</h2>
            <p className="muted">{state.message}</p>
            <button onClick={state.retry}>ลองอีกครั้ง</button>
          </div>
        </div>
      );
    }
    case "ready": {
      return <Shell />;
    }
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function NotMember({ retry }: { retry: () => void }) {
  const addFriendUrl = import.meta.env.VITE_LINE_ADD_FRIEND_URL;
  return (
    <div className="center">
      <div className="card">
        <h2>ยังไม่ได้เป็นสมาชิก</h2>
        <p className="muted">
          บัญชี LINE นี้ยังไม่ได้เพิ่มบอท BestBefore เป็นเพื่อน เพิ่มเพื่อนก่อนแล้วกดลองอีกครั้ง
        </p>
        <div className="row">
          {addFriendUrl && (
            <a href={addFriendUrl} target="_blank" rel="noreferrer">
              <button type="button">เพิ่มเพื่อน</button>
            </a>
          )}
          <button type="button" className="ghost" onClick={retry}>
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          BestBefore
        </Link>
        <nav className="topnav">
          <Link to="/">รายการ</Link>
          <Link to="/add">เพิ่ม</Link>
          <Link to="/history">ประวัติ</Link>
          <Link to="/settings">ตั้งค่า</Link>
          <Link to="/help">ช่วย</Link>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <nav className="bottomnav">
        <Link to="/">
          <span>📋</span>รายการ
        </Link>
        <Link to="/add">
          <span>➕</span>เพิ่ม
        </Link>
        <Link to="/history">
          <span>🕘</span>ประวัติ
        </Link>
        <Link to="/settings">
          <span>⚙️</span>ตั้งค่า
        </Link>
        <Link to="/help">
          <span>❓</span>ช่วย
        </Link>
      </nav>
    </div>
  );
}
