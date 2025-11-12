export default function UploadForm({ onUpload }: { onUpload: (file: File) => void }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); const input = (e.currentTarget.querySelector('input[type=file]') as HTMLInputElement); if (input && input.files && input.files[0]) onUpload(input.files[0]); }}>
      <input type="file" name="file" />
      <button type="submit">Upload</button>
    </form>
  )
}
