'use client'

import {
  Box,
  Heading,
  Text,
  Stack,
  Button,
  Flex,
} from '@chakra-ui/react'

interface ChakraCardProps {
  title: string
  description: string
  buttonText?: string
  onButtonClick?: () => void
}

export default function ChakraCard({
  title,
  description,
  buttonText = '了解更多',
  onButtonClick,
}: ChakraCardProps) {
  return (
    <Box
      maxWidth='445px'
      width='full'
      bg='white'
      boxShadow='2xl'
      borderRadius='md'
      p={6}
      overflow='hidden'
    >
      <Stack>
        <Heading
          color='gray.700'
          fontSize='2xl'
          fontFamily='body'
        >
          {title}
        </Heading>
        <Text color='gray.500'>{description}</Text>
      </Stack>
      <Flex mt={6} justifyContent='flex-end'>
        <Button
          bg='blue.400'
          color='white'
          _hover={{
            bg: 'blue.500',
          }}
          onClick={onButtonClick}
        >
          {buttonText}
        </Button>
      </Flex>
    </Box>
  )
}