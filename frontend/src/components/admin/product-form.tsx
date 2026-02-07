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
      // For new products, don't include images in the initial creation
      // Images will be uploaded separately after product is created
      const productData = {
        ...data,
        // Only include images if updating an existing product
        ...(product ? {
          images: uploadedImages.map(img => ({
            url: img.url,
            altText: img.altText,
            sortOrder: img.sortOrder ?? 0,
            isPrimary: img.isPrimary
          }))
        } : {})
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
      <div className="card-gaming">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-gaming font-bold text-primary-400 mb-4">
            BASIC INFORMATION
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-tech font-medium text-dark-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                id="name"
                {...register('name', { required: 'Product name is required' })}
                className="input-field"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400 font-tech">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-tech font-medium text-dark-700 mb-2">
                Brand
              </label>
              <input
                type="text"
                id="brand"
                {...register('brand')}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="categoryId" className="block text-sm font-tech font-medium text-dark-700 mb-2">
                Category *
              </label>
              <select
                id="categoryId"
                {...register('categoryId', { required: 'Category is required' })}
                className="input-field"
              >
                <option value="">Select a category</option>
                {categories?.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-400 font-tech">{errors.categoryId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="segmentId" className="block text-sm font-tech font-medium text-dark-700 mb-2">
                Product Segment *
              </label>
              <select
                id="segmentId"
                {...register('segmentId', { required: 'Product segment is required' })}
                className="input-field"
              >
                <option value="">Select a segment</option>
                {segments?.map(segment => (
                  <option key={segment} value={segment}>
                    {segment.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
              {errors.segmentId && (
                <p className="mt-1 text-sm text-red-400 font-tech">{errors.segmentId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="warrantyMonths" className="block text-sm font-tech font-medium text-dark-700 mb-2">
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
                className="input-field"
              />
              {errors.warrantyMonths && (
                <p className="mt-1 text-sm text-red-400 font-tech">{errors.warrantyMonths.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center">
                <input
                  id="isRefurbished"
                  type="checkbox"
                  {...register('isRefurbished')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-300 rounded"
                />
                <label htmlFor="isRefurbished" className="ml-2 block text-sm text-dark-700 font-tech">
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
            <label htmlFor="description" className="block text-sm font-tech font-medium text-dark-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              {...register('description')}
              className="input-field"
              placeholder="Detailed product description..."
            />
          </div>
        </div>
      </div>

      {/* Product Images */}
      <div className="card-gaming">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-gaming font-bold text-primary-400 mb-4">
            PRODUCT IMAGES
          </h3>
          
          {product ? (
            <ImageUpload
              images={uploadedImages}
              onUpload={(files) => handleImageUpload(files, product?.id)}
              onDelete={handleImageDelete}
              maxImages={5}
            />
          ) : (
            <div className="text-center py-8 bg-dark-200 bg-opacity-30 rounded-lg border border-dark-300 border-opacity-30">
              <svg className="mx-auto h-12 w-12 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-dark-600 font-tech">
                Save the product first, then you can upload images
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Specifications */}
      <div className="card-gaming">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-gaming font-bold text-primary-400">
              SPECIFICATIONS
            </h3>
            <button
              type="button"
              onClick={() => appendSpec({ name: '', value: '', sortOrder: specFields.length })}
              className="bg-primary-600 hover:bg-primary-500 text-white px-3 py-1 rounded-lg text-sm font-tech transition-all duration-300"
            >
              + Add Specification
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
                    className="input-field"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Value"
                    {...register(`specifications.${index}.value`)}
                    className="input-field"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Sort order"
                    {...register(`specifications.${index}.sortOrder`, { valueAsNumber: true })}
                    className="input-field"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(index)}
                    className="text-red-400 hover:text-red-300 font-tech transition-colors duration-200"
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
      <div className="card-gaming">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-gaming font-bold text-primary-400 mb-4">
            PRICING BY COUNTRY
          </h3>

          <div className="space-y-4">
            {priceFields.map((field, index) => {
              const country = countries?.find(c => c.id === field.countryId)
              return (
                <div key={field.id} className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-center">
                  <div>
                    <label className="block text-sm font-tech font-medium text-dark-700">
                      {country?.name || 'Country'}
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-dark-600 font-tech mb-1">Regular Price (FCFA)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      {...register(`prices.${index}.price`, { 
                        required: 'Price is required',
                        valueAsNumber: true,
                        min: { value: 0, message: 'Price cannot be negative' }
                      })}
                      className="input-field"
                    />
                    {errors.prices?.[index]?.price && (
                      <p className="mt-1 text-xs text-red-400 font-tech">{errors.prices[index]?.price?.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-dark-600 font-tech mb-1">Promo Price (FCFA)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      {...register(`prices.${index}.promoPrice`, { 
                        valueAsNumber: true,
                        min: { value: 0, message: 'Promo price cannot be negative' }
                      })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    {priceFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePrice(index)}
                        className="text-red-400 hover:text-red-300 text-sm font-tech transition-colors duration-200"
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
          className="btn-secondary font-tech"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary font-tech disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
        </button>
      </div>
    </form>
  )
}