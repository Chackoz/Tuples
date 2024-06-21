import React from "react";
import { jakartadesc, jakartasmall } from "../utils/fonts";

function NavBar() {
  return (
    <div className={` ${jakartasmall.className} flex w-[95vw] items-center justify-between p-5`}>
      <div className="flex items-center justify-center text-[2vw] ">

        <h1 className="flex flex-row">Tuples</h1>
      </div>
      <div className="flex w-full items-end justify-end text-[1vw]">
        <h1></h1>
      </div>
    </div>
  );
}

export default NavBar;
