import React from "react";
import classNames from "classnames";
import SimpleBar from "simplebar-react";
import Menu from "../menu/Menu";

const Sidebar = ({ fixed, theme, sidebarToggle, mobileView, className }) => {
  const classes = classNames({
    "nk-sidebar": true,
    "nk-sidebar-fixed": fixed,
    [`is-light`]: theme === "white",
    [`is-${theme}`]: theme !== "white" && theme !== "light",
    [`${className}`]: className,
  });
  return (
    <div className={classes}>
      <SimpleBar className="nk-sidebar-inner">
        <Menu sidebarToggle={sidebarToggle} mobileView={mobileView} />
      </SimpleBar>
    </div>
  );
};
export default Sidebar;
