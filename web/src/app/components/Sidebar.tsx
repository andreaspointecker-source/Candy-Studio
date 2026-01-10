"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "kaiban.sidebar.collapsed";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCollapsed(stored === "true");
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "86px" : "260px"
    );
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const navItems = [
    { href: "/", icon: "HOME", label: "Dashboard" },
    { href: "/projects/new", icon: "NEW", label: "Neues Projekt" },
    { href: "/designer", icon: "UI", label: "UI Designer" },
    { href: "/tests/workflow", icon: "TEST", label: "Workflow Test" },
    { href: "/settings", icon: "SET", label: "Einstellungen" },
  ];

  return (
    <aside className={`side-nav ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-icon" title="Candy Studio">K</div>
        <div className="brand-text">
          <p className="brand-title">Candy Studio</p>
          <p className="brand-sub">Multi-Agent Workspace</p>
        </div>
      </div>
      <nav className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onMouseEnter={() => setHoveredItem(item.href)}
            onMouseLeave={() => setHoveredItem(null)}
            className={hoveredItem === item.href ? "hovered" : ""}
            aria-label={item.label}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="side-bottom">
        <button
          className="side-toggle"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
          title={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
        >
          {collapsed ? "OPEN" : "CLOSE"}
        </button>
        <div className="side-footer">
          <span className="status-dot" aria-hidden="true" />
          <span className="side-footer-text">Session bereit</span>
        </div>
      </div>
    </aside>
  );
}
