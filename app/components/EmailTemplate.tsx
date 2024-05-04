import React from "react";

interface EmailTemplateProps {
  name: string;
  email: string;
  password: string;
}

function EmailTemplate(props: EmailTemplateProps) {
  return (
    <div>
      <h1>Welcome, {props.name}!</h1>
      <p>Thanks for trying Tuples. We are thrilled to have you on board. </p>
      <p>Here is your login information:</p>
      <table className="attributes" width="100%">
        <tbody>
          <tr>
            <td className="attributes_content">
              <table width="100%">
                <tbody>
                  <tr>
                    <td className="attributes_item">
                      <strong>Email:</strong> {props.email}
                    </td>
                  </tr>
                  <tr>
                    <td className="attributes_item">
                      <strong>Password:</strong> {props.password}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default EmailTemplate;
