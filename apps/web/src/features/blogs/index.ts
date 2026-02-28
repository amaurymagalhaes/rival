import { BlogUseCases } from './application/blog.use-cases';
import { HttpBlogsGateway } from './infrastructure/blogs-api.gateway';

const blogUseCases = new BlogUseCases(new HttpBlogsGateway());

export const getBlogsByOwner = blogUseCases.getBlogsByOwner.bind(blogUseCases);
export const getBlogByOwner = blogUseCases.getBlogByOwner.bind(blogUseCases);
export const createBlogForOwner =
  blogUseCases.createBlogForOwner.bind(blogUseCases);
export const updateBlogForOwner =
  blogUseCases.updateBlogForOwner.bind(blogUseCases);
export const deleteBlogForOwner =
  blogUseCases.deleteBlogForOwner.bind(blogUseCases);

export type { BlogMutationResult } from './domain/blog.gateway';
export type { Blog, BlogMutationInput } from './domain/blog.types';
