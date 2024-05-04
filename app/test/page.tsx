"use client";
import React from "react";

function page() {
  async function oncli() {
    try {
      await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          name: "name",
          email: "adiadithyakrishnan@gmail.com",
          password: "password"
        })
      }).then(() => {});
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  return (
    <main>
      <div>API TEST</div>
      <button
        className="y-2 bg-blue-500 px-4"
        onClick={() => {
          oncli();
        }}
      >
        Hi
      </button>
    </main>
  );
}

export default page;
