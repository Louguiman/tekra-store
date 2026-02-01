'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { 
  useCreateProductMutation, 
  useUpdateProductMutation,
  useGetCategoriesQuery,
  useGetProductSegmentsQuery,
  useGetCountriesQuery,
  useUploadProductImageMutation,
  useDeleteProductImageMutation
} from '@/store/api'
import { Product, RefurbishedGrade, ProductImage } from '@/types/product'
import ImageUpload from './image-upload'
import RefurbishedGradeSelector from './refurbished-grade-selector'

interface ProductFormData {
  name: string
  description: string
  categoryId: string
  segmentId: string
  brand: string
  isRefurbished: boolean
  refurbishedGrade?: RefurbishedGrade
  warrantyMonths: number
  specifications: Array<{
    name: string
    value: string
    sortOrder: number
  }>
  prices: Array<{
    countryId: string
    price: number
    promoPrice?: number
  }>
}

interface ProductFormProps {
  product?: Product
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<ProductImage[]>(product?.images?.map((img, index) => ({
    ...img,
    sortOrder: img.sortOrder ?? index,
  })) || [])

  const { data: categories } = useGetCategoriesQuery()
  const { data: segments } = useGetProductSegmentsQuery()
  const { data: countries } = useGetCountriesQuery()
  
  const [createProduct] = useCreateProductMutation()
  const [updateProduct] = useUpdateProductMutation()
  const [uploadImage] = useUploadProductImageMutation()
  const [deleteImage] = useDeleteProductImageMutation()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ProductFormData>({
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      categoryId: product?.category?.id || '',
      segmentId: product?.segment || '',
      brand: product?.brand || '',
      isRefurbished: product?.isRefurbished || false,
      refurbishedGrade: product?.refurbishedGrade,
      warrantyMonths: product?.warrantyMonths || 0,
      specifications: product?.specifications?.map(spec => ({
        name: spec.name,
        value: spec.value,
        sortOrder: 0
      })) || [{ name: '', value: '', sortOrder: 0 }],
      prices: product?.prices?.map(price => ({
        countryId: price.country.id,
        price: price.price,
        promoPrice: price.promoPrice
      })) || countries?.map(country => ({
        countryId: country.id,
        price: 0
      })) || []
    }
  })

  const {
    fields: specFields,
    append: appendSpec,
    remove: removeSpec
  } = useFieldArray({
    control,
    name: 'specifications'
  })

  const {
    fields: priceFields,
    append: appendPrice,
    remove: removePrice
  } = useFieldArray({
    control,
    name: 'prices'
  })

  const isRefurbished = watch('isRefurbished')

  // Initialize prices when countries are loaded
  useEffect(() => {
    if (countries && !product && priceFields.length === 0) {
      countries.forEach(country => {
        appendPrice({
          countryId: country.id,
          price: 0
        })
      })
    }
  }, [countries, product, priceFields.length, appendPrice])

  const handleImageUpload = async (files: FileList, productId?: string) => {
    if (!productId) return

    const uploadPromises = Array.from(files).map(async (file, index) => {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('altText', `${product?.name || 'Product'} image ${uploadedImages.length + index + 1}`)
      formData.append('sortOrder', (uploadedImages.length + index).toString())
      formData.append('isPrimary', (uploadedImages.length === 0 && index === 0).toString())

      try {
        const result = await uploadImage({ productId, formData }).unwrap()
        return result
      } catch (error) {
        console.error('Failed to upload image:', error)
        return null
      }
    })

    const results = await Promise.all(uploadPromises)
    const successfulUploads = results.filter(result => result !== null)
    
    setUploadedImages(prev => [
      ...prev, 
      ...successfulUploads.map((upload, index) => ({
        id: upload.id,
        url: upload.url,
        altText: upload.altText || '',
        sortOrder: upload.sortOrder ?? (prev.length + index),
        isPrimary: upload.isPrimary
      }))
    ])
  }

  const handleImageDelete = async (imageId: string) => {
    try {
      await deleteImage(imageId).unwrap()
      setUploadedImages(prev => prev.filter(img => img.id !== imageId))
    } catch (error) {
      console.error('Failed to delete image:', error)
    }
  }

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)
    
    try {
      const productData = {
        ...data,
        images: uploadedImages.map(img => ({
          url: img.url,
          altText: img.altText,
          sortOrder: img.sortOrder ?? 0,
          isPrimary: img.isPrimary
        }))
      }

      let result
      if (product) {
        result = await updateProduct({ id: product.id, ...productData }).unwrap()
      } else {
        result = await createProduct(productData).unwrap()
      }

      router.push('/admin/products')
    } catch (error) {
      console.error('Failed to save product:', error)
      alert('Failed to save product. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Product Name *
              </label>
              <input
                type="text"
                id="name"
                {...register('name', { required: 'Product name is required' })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                Brand
              </label>
              <input
                type="text"
                id="brand"
                {...register('brand')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <select
                id="categoryId"
                {...register('categoryId', { required: 'Category is required' })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a category</option>
                {categories?.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="segmentId" className="block text-sm font-medium text-gray-700">
                Product Segment *
              </label>
              <select
                id="segmentId"
                {...register('segmentId', { required: 'Product segment is required' })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a segment</option>
                {segments?.map(segment => (
                  <option key={segment} value={segment}>
                    {segment.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
              {errors.segmentId && (
                <p className="mt-1 text-sm text-red-600">{errors.segmentId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="warrantyMonths" className="block text-sm font-medium text-gray-700">
                Warranty (months)
              </label>
              <input
                type="number"
                id="warrantyMonths"
                min="0"
                max="120"
                {...register('warrantyMonths', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Warranty cannot be negative' },
                  max: { value: 120, message: 'Warranty cannot exceed 120 months' }
                })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {errors.warrantyMonths && (
                <p className="mt-1 text-sm text-red-600">{errors.warrantyMonths.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center">
                <input
                  id="isRefurbished"
                  type="checkbox"
                  {...register('isRefurbished')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isRefurbished" className="ml-2 block text-sm text-gray-900">
                  This is a refurbished product
                </label>
              </div>
            </div>

            {isRefurbished && (
              <div className="sm:col-span-2">
                <RefurbishedGradeSelector
                  value={watch('refurbishedGrade')}
                  onChange={(grade) => setValue('refurbishedGrade', grade)}
                  required={isRefurbished}
                />
              </div>
            )}
          </div>

          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              {...register('description')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Detailed product description..."
            />
          </div>
        </div>
      </div>

      {/* Product Images */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Product Images
          </h3>
          
          <ImageUpload
            images={uploadedImages}
            onUpload={(files) => handleImageUpload(files, product?.id)}
            onDelete={handleImageDelete}
            maxImages={5}
          />
        </div>
      </div>

      {/* Specifications */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Specifications
            </h3>
            <button
              type="button"
              onClick={() => appendSpec({ name: '', value: '', sortOrder: specFields.length })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Add Specification
            </button>
          </div>

          <div className="space-y-4">
            {specFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <input
                    type="text"
                    placeholder="Specification name"
                    {...register(`specifications.${index}.name`)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Value"
                    {...register(`specifications.${index}.value`)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Sort order"
                    {...register(`specifications.${index}.sortOrder`, { valueAsNumber: true })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Pricing by Country
          </h3>

          <div className="space-y-4">
            {priceFields.map((field, index) => {
              const country = countries?.find(c => c.id === field.countryId)
              return (
                <div key={field.id} className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {country?.name || 'Country'}
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Regular Price (FCFA)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      {...register(`prices.${index}.price`, { 
                        required: 'Price is required',
                        valueAsNumber: true,
                        min: { value: 0, message: 'Price cannot be negative' }
                      })}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    {errors.prices?.[index]?.price && (
                      <p className="mt-1 text-xs text-red-600">{errors.prices[index]?.price?.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Promo Price (FCFA)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      {...register(`prices.${index}.promoPrice`, { 
                        valueAsNumber: true,
                        min: { value: 0, message: 'Promo price cannot be negative' }
                      })}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    {priceFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePrice(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
        </button>
      </div>
    </form>
  )
}