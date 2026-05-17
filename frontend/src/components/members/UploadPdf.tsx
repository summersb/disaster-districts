import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type React from 'react'
import { useState } from 'react'
import StyledButton from '@/components/styled/StyledButton.tsx'
import { Card } from '@/components/ui/card'
import { genId } from '@/lib/utils'
import type { MemberDto } from '@/type'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

//pdfjsLib.GlobalWorkerOptions.workerSrc =
//  '//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js'

const headerRegex = /^[A-Za-z ]+ - \d*$/
const separatorRegex = /^[A-Z]$/

type UploadPdfProps = {
  setMembers: (members: MemberDto[]) => void
}

const UploadPdf = ({ setMembers }: UploadPdfProps): React.ReactElement => {
  const [pdfFile, setPdfFile] = useState<File | null>()

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfFile(e.target.files?.[0])
  }

  const onSubmit = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault()

    const fileReader = new FileReader()
    if (!pdfFile) {
      return
    }

    fileReader.onload = async () => {
      const pdfData = new Uint8Array(fileReader.result as ArrayBuffer)
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise

      const lines = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)

        const content = await page.getTextContent()
        for (const item of content.items) {
          if ('str' in item && item.str.trim() !== '') {
            const val = item.str.trim()
            if (val === '©') {
              continue
            }
            if (val.includes('All rights reserved')) {
              continue
            }
            if (val.includes('Church Use Only')) {
              continue
            }
            if (headerRegex.exec(val)) {
              continue
            }
            if (separatorRegex.exec(val)) {
              continue
            }
            lines.push(item.str)
            //console.log(item.str)
          }
        }
      }
      setMembers(parseMemberList(lines))
    }

    fileReader.readAsArrayBuffer(pdfFile)
  }

  function parseMemberList(list: string[]) {
    const latLngRegex = /^\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)\s*$/
    const cityRegex = /^\s*(.+?),?\s*([A-Za-z]*)\s+(\d{5}(?:-\d{4})?)\s*$/

    const members: MemberDto[] = []

    for (let i = 0; i < list.length; ) {
      if (!list[i]?.includes(',')) {
        console.log('Missing or invalid name at index', i, list[i])
        i++
        continue
      }
      let line = list[i]
      const name = line.split(',')
      const temp: Partial<MemberDto> = {
        familyName: name[0]?.trim(),
        name: name?.[1]?.trim(),
      }
      line = list[++i]
      if (line?.includes(',')) {
        // If the next line is not an address, process the member immediately
      } else {
        // Process address details only if they exist
        if (line && !line.includes(',')) {
          temp.address1 = line
          line = list[++i]
        }
        let city = cityRegex.exec(line)
        if (line && !line.includes(',') && city?.length !== 4) {
          temp.address2 = line
          line = list[++i]
        }
        city = cityRegex.exec(line)
        if (line && city?.length === 4) {
          temp.city = city[1] || ''
          temp.state = city[2] || ''
          temp.postalCode = city[3] || ''
          line = list[++i]
        }
        const latLng = latLngRegex.exec(line)
        if (line && latLng?.length === 3) {
          temp.lat = Number(latLng[1])
          temp.lng = Number(latLng[2])
          line = list[++i]
        }
      }

      const member: MemberDto = {
        id: genId(),
        familyName: temp.name ?? '',
        ...temp,
      } as MemberDto

      members.push(member as MemberDto)
    }

    return members
  }

  return (
    <>
      <div className="text-xl flex justify-center m-10">Upload PDF</div>
      <div className="flex">
        <Card className="w-1/2">
          <ul className="mb-6">
            <li>
              From{' '}
              <a
                href="https://directory.churchofjesuschrist.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                https://directory.churchofjesuschrist.org
              </a>
            </li>
            <li>Print your wards member list</li>
            <li>Select "Full Address" and check "Show Latitude/Longitude"</li>
            <li>Then print to a file and upload that file</li>
          </ul>
          <form>
            <input
              type="file"
              id="pdfFileInput"
              accept=".pdf"
              onChange={onChange}
              className="mb-4 p-2 border rounded-md bg-gray-700 text-white"
            />
            <StyledButton onClick={onSubmit}>IMPORT PDF</StyledButton>
          </form>
        </Card>
        <div className="w-1/2 p-4">
          <img
            src="/images/print-ward.png"
            alt="Show how to print PDF report"
            className="h-[600px] w-auto object-contain"
          />
        </div>
      </div>
    </>
  )
}

export default UploadPdf
