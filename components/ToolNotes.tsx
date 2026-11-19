type ToolNotesProps = {
  /** 이 서비스를 왜 만들었는지 - 원래 생각했던 존재 이유 */
  purpose: string;
  /** 아직 구현하지 못한 부분들 */
  todo: string[];
};

// 사용법 (새 도구 페이지 최하단에 추가):
// <ToolNotes
//   purpose="왜 이 도구를 만들었는지 한두 문장"
//   todo={["아직 못한 것 1", "아직 못한 것 2"]}
// />
export default function ToolNotes({ purpose, todo }: ToolNotesProps) {
  return (
    <div className="mt-12 pt-6 border-t border-dashed border-neutral-300 dark:border-neutral-700 text-sm text-neutral-500 space-y-4">
      <div>
        <div className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          왜 만들었나
        </div>
        <p>{purpose}</p>
      </div>
      {todo.length > 0 && (
        <div>
          <div className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            아직 구현 못한 것
          </div>
          <ul className="list-disc list-inside space-y-1">
            {todo.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
