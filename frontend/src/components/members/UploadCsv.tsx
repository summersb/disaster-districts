import type React from 'react'
import { useState } from 'react'
import StyledButton from '@/components/styled/StyledButton.tsx'
import { Card } from '@/components/ui/card'
import type { MemberDto } from '@/type'

type UploadCsvProps = {
  setMembers: (members: MemberDto[]) => void
}

const UploadCsv = ({ setMembers }: UploadCsvProps): React.ReactElement => {
  const [file, setFile] = useState<File | null>()

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0])
  }

  const csvFileToArray = (str: string) => {
    const csvRows = str.slice(str.indexOf('\n') + 1).split('\n')

    const array: MemberDto[] = csvRows.map((i) => {
      const values = i.split(';')
      const member: MemberDto = {
        id: 0,
        familyName: values[0],
        name: values[1],
        formattedAddress: values[2],
        address1: values[3],
        address2: values[4],
        city: values[5],
        state: values[6],
        postalCode: values[7],
        phone: values[8],
        lat: Number(values[9]),
        lng: Number(values[10]),
      }
      return member
    })

    setMembers(array)
  }

  const onSubmit = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()

    const fileReader = new FileReader()

    if (file) {
      fileReader.onload = (event) => {
        const text = event.target?.result
        if (text) {
          csvFileToArray(text as string)
        }
      }

      fileReader.readAsText(file)
    }
  }
  return (
    <>
      <div className="text-xl flex justify-around m-10">Upload CSV</div>
      <Card>
        <form>
          <input
            type="file"
            id="csvFileInput"
            accept=".csv"
            onChange={onChange}
            className="mb-4 p-2 border rounded-md bg-gray-700 text-white"
          />
          <StyledButton onClick={onSubmit}>IMPORT CSV</StyledButton>
        </form>
      </Card>
    </>
  )
}

export default UploadCsv
