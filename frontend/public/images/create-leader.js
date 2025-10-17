import fs from 'fs'

const leader = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="--COLOR--"> <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/> </svg>'
const assistant = '<svg xmlns = "http://www.w3.org/2000/svg" height = "24px" viewBox = "0 -960 960 960" width = "24px" fill = "--COLOR--" > <path d = "M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113ZM120-240h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 320Zm0-400Z" /> </svg>'


const colors = [
  { name: 'Red', value: '#FF5733' },
  { name: 'Green', value: '#33FF57' },
  { name: 'Blue', value: '#3357FF' },
  { name: 'Pink', value: '#FF33A1' },
  { name: 'Orange', value: '#FF8F33' },
  { name: 'Cyan', value: '#33FFF1' },
  { name: 'Dark Red', value: '#FF3333' },
  { name: 'Purple', value: '#8F33FF' },
  { name: 'Yellow', value: '#FFFF33' },
  { name: 'Lime', value: '#33FF8F' },
  { name: 'Indigo', value: '#5733FF' },
  { name: 'Violet', value: '#A133FF' },
  { name: 'Teal', value: '#33FFA1' },
  { name: 'Bright Red', value: '#FF5733' },
  { name: 'Scarlet', value: '#FF3333' },
  { name: 'Sky Blue', value: '#33A1FF' },
  { name: 'Dark Orange', value: '#FF8F33' },
  { name: 'Light Green', value: '#33FF57' },
  { name: 'Magenta', value: '#FF33FF' },
  { name: 'Bright Green', value: '#8FFF33' }
]

colors.forEach(color => {
  fs.writeFileSync(`public/images/Leader-${color.name}.svg`, leader.replace('--COLOR--', color.value))
  fs.writeFileSync(`public/images/Assistant-${color.name}.svg`, assistant.replace('--COLOR--', color.value))
})