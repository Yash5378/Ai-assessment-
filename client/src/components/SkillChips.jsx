export default function SkillChips({ skills }) {
  if (!skills || skills.length === 0) return null;
  return (
    <div className="chips">
      {skills.map((skill) => (
        <span key={skill} className="chip">
          {skill}
        </span>
      ))}
    </div>
  );
}
