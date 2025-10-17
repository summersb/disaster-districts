import { useFormContext } from 'react-hook-form'
import { Textarea } from '@/components/ui/textarea'
import Paper from '@/components/styled/Paper.tsx'

const ImportDirectoryList = () => {
  const { register } = useFormContext()

  return (
    <Paper>
      <ul>
        <li>Open https://directory.churchofjesuschrist.org</li>
        <li>
          Click the print icon on the top right of the page, not the browsers
          print
        </li>
        <li>Change the header value to nothing</li>
        <li>Select "Full Address" and check "Show Latitude/Longitude"</li>
        <li>Click print</li>
        <li>
          In the preview select all the text (ctrl-a) then copy it (ctrl-c)
        </li>
        <li>Paste the content into the box below (ctrl-v)</li>
      </ul>
      <Textarea {...register('data')} rows={20} />
    </Paper>
  )
}

export default ImportDirectoryList
