export default function EmployerInputStyles() {
  return (
    <style jsx global>{`
      .input {
        width: 100%;
        border: 1px solid #ddd5c3;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 14px;
        outline: none;
        background: #fff;
      }
      .input:focus {
        border-color: #0f1420;
      }
    `}</style>
  );
}
